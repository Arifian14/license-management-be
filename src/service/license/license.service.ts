import { CreateLisenceDto } from '@common/dto/lisence/CreateLisenceDto';
import { PaginationResult, SearchCondition } from '@database/models/base.model';
import License, { LicenseAttributes } from '@database/models/license.model';
import LicenseHealthcheck from '@database/models/license_healthcheck.model';
import MasterVendorApplication from '@database/models/masters/master_vendor_application.model';
import { NotFoundException } from '@helper/Error/NotFound/NotFoundException';
import { stringToDate } from '@helper/function/common';
import { DateTime } from 'luxon';
import { Op, WhereOptions } from 'sequelize';

export interface LicenseSummary {
  // Hitungan berdasar baris License/PKS
  total: number;
  above3Months: number;
  under3Months: number;
  under1Month: number;
  statusDistribution: {
    green: number;
    yellow: number;
    red: number;
  };
  // Hitungan berdasar nama aplikasi UNIK (kolom `application`); nama sama dihitung satu
  applications: {
    total: number;
    above3Months: number;
    under3Months: number;
    under1Month: number;
    // aplikasi unik yang punya PKS pada pita 1-3 bulan (30 < due <= 90).
    // DIHITUNG TERPISAH (bukan under3Months - under1Month) karena satu aplikasi
    // bisa punya PKS di pita <=30 DAN di (30,90] sekaligus, sehingga pengurangan
    // akan salah kurang. Nilai ini selaras dengan list aplikasi saat kartu/pie diklik.
    between1And3Months: number;
  };
}

// Satu baris ringkasan per nama aplikasi unik (dipakai list aplikasi di halaman license)
export interface ApplicationSummaryRow {
  application: string;
  totalPks: number; // jumlah PKS aplikasi ini yang lolos filter status
  under1Month: number; // PKS jatuh tempo <= 30 hari
  under3Months: number; // PKS jatuh tempo <= 90 hari
  nearestDueDate: Date; // jatuh tempo terdekat di antara PKS aplikasi ini
  status: 'red' | 'yellow' | 'green'; // status dari jatuh tempo terdekat
}

export interface ApplicationListResult {
  data: ApplicationSummaryRow[];
  totalCount: number;
  pageSize: number;
  totalPages: number;
  currentPage: number;
}

export default class LicenseService {
  constructor() {}

  async getSummary(): Promise<LicenseSummary> {
    const now = DateTime.now();
    const in30Days = now.plus({ days: 30 }).toJSDate();
    const in90Days = now.plus({ days: 90 }).toJSDate();

    const [total, under3Months, under1Month, appTotal, appAbove3Months, appUnder3Months, appUnder1Month, appBetween1And3] =
      await Promise.all([
        License.count(),
        // selaras dengan filter index: under_3_months => dueDateLicense <= now+90
        License.count({ where: { dueDateLicense: { [Op.lte]: in90Days } } }),
        // under_1_month => dueDateLicense <= now+30
        License.count({ where: { dueDateLicense: { [Op.lte]: in30Days } } }),
        // aplikasi UNIK (nama sama dihitung satu)
        License.count({ distinct: true, col: 'application' }),
        License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.gt]: in90Days } } }),
        License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.lte]: in90Days } } }),
        License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.lte]: in30Days } } }),
        License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.gt]: in30Days, [Op.lte]: in90Days } } }),
        // aplikasi UNIK pada pita 1-3 bulan (30 < due <= 90); selaras status `between_1_3_months`
      ]);

    // Distribusi status mengikuti license.resource.ts:
    // red   = dueDate < now+30 (mencakup yang sudah lewat)
    // yellow= now+30 <= dueDate < now+90
    // green = dueDate >= now+90
    const red = under1Month;
    const yellow = under3Months - under1Month;
    const green = total - under3Months;

    return {
      total,
      above3Months: appAbove3Months,
      under3Months,
      under1Month,
      statusDistribution: { green, yellow, red },
      applications: {
        total: appTotal,
        above3Months: appAbove3Months,
        under3Months: appUnder3Months,
        under1Month: appUnder1Month,
        between1And3Months: appBetween1And3,
      },
    };
  }

  // Daftar aplikasi (grouping baris License berdasar kolom `application`).
  // Hanya aplikasi yang punya PKS pada pita status terpilih yang muncul.
  // Agregasi dilakukan di aplikasi (dataset internal kecil) agar tetap DB-agnostic.
  // Kondisi Sequelize untuk pita jatuh tempo, selaras index/getSummary.
  private dueDateWhere(status?: string): WhereOptions | undefined {
    const now = DateTime.now();
    const in30Days = now.plus({ days: 30 }).toJSDate();
    const in90Days = now.plus({ days: 90 }).toJSDate();
    switch (status) {
      case 'under_1_month':
        return { dueDateLicense: { [Op.lte]: in30Days } };
      case 'under_3_months':
        return { dueDateLicense: { [Op.lte]: in90Days } };
      case 'between_1_3_months':
        return { dueDateLicense: { [Op.gt]: in30Days, [Op.lte]: in90Days } };
      case 'above_3_months':
        return { dueDateLicense: { [Op.gt]: in90Days } };
      default:
        return undefined;
    }
  }

  async getApplicationList(input: {
    status?: string;
    page: number;
    perPage: number;
    search?: string;
  }): Promise<ApplicationListResult> {
    const now = DateTime.now();
    const in30Days = now.plus({ days: 30 }).toJSDate();
    const in90Days = now.plus({ days: 90 }).toJSDate();

    const where: WhereOptions = { ...(this.dueDateWhere(input.status) ?? {}) };
    if (input.search) {
      (where as Record<string, unknown>).application = { [Op.like]: `%${input.search}%` };
    }

    // Ambil kolom minimal, biarkan Sequelize/paranoid menyaring baris terhapus.
    const rows = (await License.findAll({
      attributes: ['application', 'dueDateLicense'],
      where,
      raw: true,
    })) as unknown as Array<{ application: string; dueDateLicense: Date }>;

    // Group per nama aplikasi
    const map = new Map<string, ApplicationSummaryRow>();
    for (const row of rows) {
      const due = new Date(row.dueDateLicense);
      const existing = map.get(row.application);
      const group: ApplicationSummaryRow = existing ?? {
        application: row.application,
        totalPks: 0,
        under1Month: 0,
        under3Months: 0,
        nearestDueDate: due,
        status: 'green',
      };
      group.totalPks += 1;
      if (due <= in30Days) group.under1Month += 1;
      if (due <= in90Days) group.under3Months += 1;
      if (due < group.nearestDueDate) group.nearestDueDate = due;
      map.set(row.application, group);
    }

    // Status per aplikasi mengikuti jatuh tempo terdekat (selaras license.resource.ts)
    const all = Array.from(map.values()).map((group) => {
      const days = DateTime.fromJSDate(group.nearestDueDate).diffNow('days').days;
      group.status = days < 30 ? 'red' : days < 90 ? 'yellow' : 'green';
      return group;
    });

    // Urutkan berdasar jatuh tempo terdekat (paling mendesak dulu)
    all.sort((a, b) => a.nearestDueDate.getTime() - b.nearestDueDate.getTime());

    const totalCount = all.length;
    const perPage = input.perPage > 0 ? input.perPage : 10;
    const page = input.page > 0 ? input.page : 1;
    const start = (page - 1) * perPage;
    const data = all.slice(start, start + perPage);

    return {
      data,
      totalCount,
      pageSize: perPage,
      totalPages: Math.ceil(totalCount / perPage),
      currentPage: page,
    };
  }

  async getById(id: number): Promise<License> {
    const license = await License.findByPk(id, {
      include: [
        { model: LicenseHealthcheck, as: 'healthchecks' },
        {
          model: MasterVendorApplication,
          as: 'vendorApplication',
        },
      ],
    });
    if (!license) {
      throw new NotFoundException('License not found');
    }
    return license;
  }

  async create(data: CreateLisenceDto): Promise<License> {
    const license = await License.create({
      pks: data.pks,
      application: data.application,
      dateStarted: stringToDate(data.date_started as string) ?? null,
      dueDateLicense: DateTime.fromISO(`${data.due_date_license}`, { zone: 'UTC' }).toJSDate(),
      vendor_id: data.vendor_id ?? undefined,
      descriptions: data.descriptions ?? null,
      filePks: data.file_pks,
      fileBast: data.file_bast,
      isNotified: data.is_notified ? data.is_notified : true,
      pksFileId: null,
      bastFileId: null,
    });
    license.save();
    if (!license) {
      throw new NotFoundException('License not created');
    }
    return license;
  }

  async deleteById(id: number): Promise<null> {
    const license = await License.findByPk(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }
    await license.destroy();
    return null;
  }

  async updateById(
    id: number,
    data: Partial<CreateLisenceDto>,
    filePksId?: number,
    fileBastId?: number
  ): Promise<License> {
    const license = await License.findByPk(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }
    await license.update({
      pks: data.pks,
      application: data.application,
      dateStarted: stringToDate(data.date_started as string) ?? null,
      dueDateLicense: DateTime.fromISO(`${data.due_date_license}`, { zone: 'UTC' }).toJSDate(),
      filePks: data.file_pks,
      fileBast: data.file_bast,
      vendor_id: data.vendor_id,
      descriptions: data.descriptions,
      isNotified: data.is_notified ? data.is_notified : true,
      pksFileId: null,
      bastFileId: null,
    });
    return license;
  }

  async getAll(input: {
    perPage: number;
    page: number;
    searchConditions?: SearchCondition[];
    sortOptions?: any;
    symbolCondition?: WhereOptions;
  }): Promise<PaginationResult<License>> {
    const results = await License.paginate<License>({
      PerPage: input.perPage,
      page: input.page,
      searchConditions: input.searchConditions || [],
      sortOptions: input.sortOptions,
      symbolCondition: input.symbolCondition,
      includeConditions: [
        {
          model: LicenseHealthcheck,
          as: 'healthchecks',
        },
        {
          model: MasterVendorApplication,
          as: 'vendorApplication',
        },
      ],
    });

    return results;
  }

  licenseResponse(license: License): LicenseAttributes {
    // const pksFileBase64 = Buffer.from(license.pksFileId?.toString() || '').toString('base64');
    // const bastFileBase64 = Buffer.from(license.bastFileId?.toString() || '').toString('base64');
    const dueDate = DateTime.fromISO(license.dueDateLicense.toString(), { zone: 'UTC' });
    const dayTodaytoDueDate = dueDate.diffNow('days').days;
    let colorStatus = 'green';
    if (dayTodaytoDueDate < 30) {
      colorStatus = 'red';
    } else if (dayTodaytoDueDate < 90) {
      colorStatus = 'yellow';
    }
    return {
      ...license.toJSON(),
      // pksFileUrl: `/api/document/${pksFileBase64}`,
      // bastFileUrl: `/api/document/${bastFileBase64}`,
      // pks_file_id: undefined,
      // bast_file_id: undefined,
      status: colorStatus,
      healthchecks: license.healthchecks,
    };
  }
}

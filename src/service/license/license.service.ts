import { CreateLisenceDto } from '@common/dto/lisence/CreateLisenceDto';
import { PaginationResult, SearchCondition } from '@database/models/base.model';
import License, { LicenseAttributes } from '@database/models/license.model';
import LicenseHealthcheck from '@database/models/license_healthcheck.model';
import MasterVendorApplication from '@database/models/masters/master_vendor_application.model';
import { NotFoundException } from '@helper/Error/NotFound/NotFoundException';
import { stringToDate } from '@helper/function/common';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';

export interface LicenseSummary {
  // Hitungan berdasar baris License/PKS
  total: number;
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
    under3Months: number;
    under1Month: number;
  };
}

export default class LicenseService {
  constructor() {}

  async getSummary(): Promise<LicenseSummary> {
    const now = DateTime.now();
    const in30Days = now.plus({ days: 30 }).toJSDate();
    const in90Days = now.plus({ days: 90 }).toJSDate();

    const [total, under3Months, under1Month, appTotal, appUnder3Months, appUnder1Month] = await Promise.all([
      License.count(),
      // selaras dengan filter index: under_3_months => dueDateLicense <= now+90
      License.count({ where: { dueDateLicense: { [Op.lte]: in90Days } } }),
      // under_1_month => dueDateLicense <= now+30
      License.count({ where: { dueDateLicense: { [Op.lte]: in30Days } } }),
      // aplikasi UNIK (nama sama dihitung satu)
      License.count({ distinct: true, col: 'application' }),
      License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.lte]: in90Days } } }),
      License.count({ distinct: true, col: 'application', where: { dueDateLicense: { [Op.lte]: in30Days } } }),
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
      under3Months,
      under1Month,
      statusDistribution: { green, yellow, red },
      applications: {
        total: appTotal,
        under3Months: appUnder3Months,
        under1Month: appUnder1Month,
      },
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
  }): Promise<PaginationResult<License>> {
    const results = await License.paginate<License>({
      PerPage: input.perPage,
      page: input.page,
      searchConditions: input.searchConditions || [],
      sortOptions: input.sortOptions,
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

/// <reference path="../custom.d.ts" />
import { CreateLisenceDto } from '@common/dto/lisence/CreateLisenceDto';
import { LicenseAttributes } from '@database/models/license.model';
import { BadRequestException } from '@helper/Error/BadRequestException/BadRequestException';
import { ProcessError } from '@helper/Error/errorHandler';
import { isStringNumber } from '@helper/function/common';
import { ResponseApi, ResponseApiWithPagination } from '@helper/interface/response.interface';
import { licenseResource } from '@resource/license/license.resource';
import { DocumentService } from '@service/document/document.service';
import LicenseService from '@service/license/license.service';
import { LicenseHealcheckService } from '@service/license/licenseHealtheck.service';
import { HttpStatusCode } from 'axios';
import { Request, Response } from 'express';
import { DateTime } from 'luxon';
import { Op, WhereOptions } from 'sequelize';

export class LicenseController {
  private licenseService: LicenseService;
  private documentService: DocumentService;
  private licenseHealthcheckService: LicenseHealcheckService;

  constructor() {
    this.licenseService = new LicenseService();
    this.documentService = new DocumentService();
    this.licenseHealthcheckService = new LicenseHealcheckService();
  }

  async create(req: Request, res: Response<ResponseApi<LicenseAttributes>>) {
    try {
      const payload = req.body as CreateLisenceDto;

      const license = await this.licenseService.create(payload);
      if (payload.healthchecks && payload.healthchecks?.length > 0) {
        await Promise.all(
          payload.healthchecks.map(async (healthcheck) => {
            await this.licenseHealthcheckService.create(license.id, healthcheck);
          })
        );
      }
      const result = await this.licenseService.getById(license.id);

      res.status(HttpStatusCode.Created).json({
        message: 'License created successfully',
        statusCode: HttpStatusCode.Created,
        data: licenseResource(result),
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async show(req: Request, res: Response<ResponseApi<LicenseAttributes>>) {
    try {
      const id = parseInt(req.params.id, 10);
      const license = await this.licenseService.getById(id);

      res.status(HttpStatusCode.Ok).json({
        message: 'License retrieved successfully',
        statusCode: HttpStatusCode.Ok,
        data: licenseResource(license),
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async destroy(req: Request, res: Response<ResponseApi<null>>) {
    try {
      const id = parseInt(req.params.id, 10);
      await this.licenseService.deleteById(id);
      res.status(204).json({
        message: 'License deleted successfully',
        statusCode: HttpStatusCode.NoContent,
        data: null,
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async update(req: Request, res: Response<ResponseApi<LicenseAttributes>>) {
    try {
      const id = req.params.id;

      const payload = req.body as CreateLisenceDto;

      if (!isStringNumber(id)) {
        throw new BadRequestException('Invalid Url');
      }

      const licenseId = parseInt(id, 10);

      const license = await this.licenseService.getById(licenseId);

      let filePksId: number | undefined;
      let fileBastId: number | undefined;


      const updatedLicense = await this.licenseService.updateById(licenseId, payload, filePksId, fileBastId);
     
      await this.licenseHealthcheckService.deleteByLicenseId(updatedLicense.id);
      if (payload.healthchecks && payload.healthchecks?.length > 0) {
        await Promise.all(
          payload.healthchecks.map(async (healthcheck) => {
            await this.licenseHealthcheckService.create(updatedLicense.id, healthcheck);
          })
        );
      }
      const result = await this.licenseService.getById(updatedLicense.id);

      res.status(HttpStatusCode.Ok).json({
        message: 'License updated successfully',
        statusCode: HttpStatusCode.Ok,
        data: licenseResource(result),
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async summary(req: Request, res: Response<ResponseApi<Awaited<ReturnType<LicenseService['getSummary']>>>>) {
    try {
      const data = await this.licenseService.getSummary();
      res.status(HttpStatusCode.Ok).json({
        message: 'License summary retrieved successfully',
        statusCode: HttpStatusCode.Ok,
        data,
      });
    } catch (error) {
      ProcessError(error, res);
    }
  }

  async applications(req: Request, res: Response) {
    try {
      const { page, per_page, status, application } = req.query;

      const result = await this.licenseService.getApplicationList({
        status: (status as string) ?? 'all',
        page: parseInt((page as string) ?? '1', 10),
        perPage: parseInt((per_page as string) ?? '10', 10),
        search: (application as string) ?? '',
      });

      res.status(HttpStatusCode.Ok).json({
        message: 'OK',
        statusCode: HttpStatusCode.Ok,
        data: result.data,
        meta: {
          currentPage: result.currentPage,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      ProcessError(error, res);
    }
  }

  async index(req: Request, res: Response<ResponseApiWithPagination<LicenseAttributes>>) {
    try {
      let { page, per_page, pks, status, application } = req.query;

      if (!status) {
        status = 'all';
      }

      // Ambang tanggal jatuh tempo relatif terhadap hari ini
      const now = DateTime.now();
      const d30 = now.plus({ days: 30 }).toISODate(); // batas 1 bulan
      const d90 = now.plus({ days: 90 }).toISODate(); // batas 3 bulan

      // Kondisi jatuh tempo per jenis filter:
      //   under_1_month      => <= +30 hari (kumulatif, termasuk expired)
      //   under_3_months     => <= +90 hari (kumulatif)
      //   between_1_3_months => > +30 hari DAN <= +90 hari (pita "sedang", presisi non-kumulatif)
      //   all/lainnya        => tanpa filter tanggal
      let dueDateCondition: Record<symbol, string | null> | undefined;
      switch (status) {
        case 'under_1_month':
          dueDateCondition = { [Op.lte]: d30 };
          break;
        case 'under_3_months':
          dueDateCondition = { [Op.lte]: d90 };
          break;
        case 'between_1_3_months':
          dueDateCondition = { [Op.gt]: d30, [Op.lte]: d90 };
          break;
        case 'above_3_months':
          dueDateCondition = { [Op.gt]: d90 };
          break;
        default:
          dueDateCondition = undefined;
      }

      const keywoard = (pks as string) ?? '';
      const searchOr: WhereOptions | undefined = keywoard
        ? {
            [Op.or]: [
              { pks: { [Op.like]: `%${keywoard}%` } },
              { application: { [Op.like]: `%${keywoard}%` } },
            ],
          }
        : undefined;

      const symbolCondition: WhereOptions | undefined =
        dueDateCondition || searchOr
          ? {
              ...(dueDateCondition ? { dueDateLicense: dueDateCondition } : {}),
              ...(searchOr ?? {}),
            }
          : undefined;

      const licenses = await this.licenseService.getAll({
        perPage: parseInt((per_page as string) ?? '10', 10),
        page: parseInt((page as string) ?? '1', 10),
        searchConditions: [
          {
            keyValue: (application as string) ?? '',
            operator: Op.eq,
            keyColumn: 'application',
            keySearch: 'application',
          },
          // Filter aplikasi (exact) untuk mode "Detail PKS"; keyValue kosong diabaikan.
          {
            keyValue: (application as string) ?? '',
            operator: Op.eq,
            keyColumn: 'application',
            keySearch: 'application',
          },
        ],
        symbolCondition,
      });

      res.status(HttpStatusCode.Ok).json({
        message: 'OK',
        statusCode: HttpStatusCode.Ok,
        data: licenses.data.map((license) => licenseResource(license)),
        meta: {
          currentPage: licenses.currentPage,
          pageSize: licenses.pageSize,
          totalCount: licenses.totalCount,
          totalPages: licenses.totalPages,
        },
      });
    } catch (error) {
      ProcessError(error, res);
    }
  }
}

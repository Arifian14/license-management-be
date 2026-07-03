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
import { Op } from 'sequelize';

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

  async index(req: Request, res: Response<ResponseApiWithPagination<LicenseAttributes>>) {
    try {
      let { page, per_page, pks, status } = req.query;

      if (!status) {
        status = 'all';
      }

      let dueDateThreshold: number | undefined;

      switch (status) {
        case 'under_3_months':
          dueDateThreshold = 90;
          break;
        case 'under_1_month':
          dueDateThreshold = 30;
          break;
        default:
          dueDateThreshold = 0;
      }
      let thresholdDate: string | null = null;
      if (dueDateThreshold !== 0) {
        const today = DateTime.now();
        thresholdDate = today.plus({ days: dueDateThreshold }).toISODate();
      }

      const licenses = await this.licenseService.getAll({
        perPage: parseInt((per_page as string) ?? '10', 10),
        page: parseInt((page as string) ?? '1', 10),
        searchConditions: [
          {
            keyValue: `%${(pks as string) ?? ''}%`,
            operator: Op.like,
            keyColumn: 'pks',
            keySearch: 'pks',
          },
          {
            keyValue: thresholdDate ?? '',
            operator: Op.lte,
            keyColumn: 'dueDateLicense',
            keySearch: 'dueDateLicense',
          },
        ],
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

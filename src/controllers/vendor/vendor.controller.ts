import { Request, Response } from 'express';
import { CreateVendorDto } from '@common/dto/vendor/CreateVendor.dto';
import { HttpStatusCode } from 'axios';
import { ResponseApi } from '@helper/interface/response.interface';
import { ProcessError } from '@helper/Error/errorHandler';
import { MasterVendorApplicationAttributes } from '@database/models/masters/master_vendor_application.model';
import { masterVendorApplicationResource } from '@resource/master/vendor_application.resource';
import MasterVendorApplicationService from '@service/master/masterVendorApps.service';

export class VendorController {
    private vendorService = new MasterVendorApplicationService();

    async index(req: Request, res: Response<ResponseApi<MasterVendorApplicationAttributes[]>>) {
        try {
            const data = await this.vendorService.fetchAll();
            res.status(HttpStatusCode.Ok).json({
                message: 'OK',
                statusCode: HttpStatusCode.Ok,
                data: data.map((v) => masterVendorApplicationResource(v)),
            });
        }catch (err) { ProcessError(err, res); }
    }

    async create(req: Request, res: Response<ResponseApi<MasterVendorApplicationAttributes>>) {
        try {
            const vendor = await this.vendorService.create(req.body as CreateVendorDto);
            
            res.status(HttpStatusCode.Created).json({
                message: 'Vendor created successfully',
                statusCode: HttpStatusCode.Created,
                data: masterVendorApplicationResource(vendor),
            })
        } catch (err) { ProcessError(err, res); }
    }

    // TODO: show(req)  -> vendorService.getById(parseInt(req.params.id))
    async show(req: Request, res: Response<ResponseApi<MasterVendorApplicationAttributes>>) {
        try {
            const id = parseInt(req.params.id, 10);
            const vendor = await this.vendorService.getById(id);

            res.status(HttpStatusCode.Ok).json({
                message: 'Vendor retrieved successfully',
                statusCode: HttpStatusCode.Ok,
                data: masterVendorApplicationResource(vendor),
            });
        } catch (err) { ProcessError(err, res); }
    }
    // TODO: update(req)-> vendorService.updateById(id, req.body)
    async update(req: Request, res: Response<ResponseApi<MasterVendorApplicationAttributes>>) {
        try {
            const id = parseInt(req.params.id, 10);
            const vendor = await this.vendorService.updateById(id, req.body as CreateVendorDto);

            res.status(HttpStatusCode.Ok).json({
                message: 'Vendor updated successfully',
                statusCode: HttpStatusCode.Ok,
                data: masterVendorApplicationResource(vendor),
            });
        } catch (err) { ProcessError(err, res); }
    }
    // TODO: destroy(req)-> vendorService.deleteById(id), balas 204
    async destroy(req: Request, res: Response<ResponseApi<null>>) {
        try {
            const id = parseInt(req.params.id, 10);
            await this.vendorService.deleteById(id);

            res.status(204).json({
                message: 'Vendor deleted successfully',
                statusCode: HttpStatusCode.NoContent,
                data: null,
            });
        } catch (err) { ProcessError(err, res); }
    }
}
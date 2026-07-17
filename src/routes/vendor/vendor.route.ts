import { Router } from "express";
import { VendorController } from "@controllers/vendor/vendor.controller";
import { validationMiddleware } from "@middleware/validation.middleware";
import { CreateVendorDto } from "@common/dto/vendor/CreateVendor.dto";

    export default class VendorRoute {
    router: Router;
    private vendorController : VendorController;
    constructor() {
        this.router = Router({ mergeParams: true });
        this.vendorController = new VendorController();
        this.serve();
    }
    serve() {
        this.router.route('/')
            .get((req, res) => this.vendorController.index(req, res))
            .post(validationMiddleware(CreateVendorDto), (req, res) => this.vendorController.create(req, res));
        this.router.route('/:id')
            .get((req, res) => this.vendorController.show(req, res))
            .put(validationMiddleware(CreateVendorDto), (req,res) => this.vendorController.update(req, res))
            .delete((req, res) => this.vendorController.destroy(req, res));
    }
}
import { Router } from 'express';
import { LicenseController } from '@controllers/license/license.controller';
import { validationMiddleware } from '@middleware/validation.middleware';
import { CreateLisenceDto } from '@common/dto/lisence/CreateLisenceDto';
import { uploadForLicense } from '@middleware/multer.middleware';

export default class LicenseRoute {
  router: Router;
  private licenseController: LicenseController; // Replace with actual controller type
  constructor() {
    this.router = Router({ mergeParams: true });
    this.licenseController = new LicenseController(); // Initialize with actual controller instance
    this.serve();
  }

  serve() {
    this.router
      .route('/')
      .post(uploadForLicense, validationMiddleware(CreateLisenceDto), (req, res) =>
        this.licenseController.create(req, res)
      )
      .get((req, res) => this.licenseController.index(req, res));
    this.router.route('/summary').get((req, res) => this.licenseController.summary(req, res));
    this.router
      .route('/:id')
      .get((req, res) => this.licenseController.show(req, res))
      .delete((req, res) => this.licenseController.destroy(req, res))
      .put(uploadForLicense, validationMiddleware(CreateLisenceDto), (req, res) =>
        this.licenseController.update(req, res)
      );
  }
}

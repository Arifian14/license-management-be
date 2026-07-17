import express from 'express';
import { jwtMiddleware } from './middleware/jwt.middleware';
import MainRouter from './routes';
import AuthRoute from './routes/auth/auth.route';
import DocumentRouter from './routes/document/document.route';
import { IncidentRouter } from './routes/incident/incident.route';
import LicenseRoute from './routes/license/license.route';
import { MasterRouter } from './routes/master/master.route';
import userRouter from './routes/user/user.route';
import MsaV2Route from './routes/v2/msa/MsaV2.route';
import VendorRoute from './routes/vendor/vendor.route';

export class Routes {
  constructor(private expressInstance: express.Express) {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Register main routes
    this.expressInstance.use('/', new MainRouter().router);
    this.expressInstance.use('/api/users', new userRouter().router);
    this.expressInstance.use('/api/auth', new AuthRoute().router);
    this.expressInstance.use('/api/licenses', jwtMiddleware(), new LicenseRoute().router);
    this.expressInstance.use('/api/document', new DocumentRouter().router);
    this.expressInstance.use('/api/master', new MasterRouter().router);
    this.expressInstance.use('/api/incidents', jwtMiddleware(), new IncidentRouter().router);
    this.expressInstance.use('/api/v2/msa', jwtMiddleware(), new MsaV2Route().router);
    this.expressInstance.use('/api/vendors', jwtMiddleware(), new VendorRoute().router);
  }
}

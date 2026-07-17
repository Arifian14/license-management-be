/// <reference path="../custom.d.ts" />
import { Request, Response } from 'express';
import { UserAttributes } from '@database/models/user.model';
import { ProcessError } from '@helper/Error/errorHandler';
import UserService from '@service/users/user.service';
import { IResponse } from '../interface';
import { messages } from '@config/message';
import { HttpStatusCode } from 'axios';

export class UserController {
  private userServices: UserService;

  constructor() {
    this.userServices = new UserService();
  }

  async read(req: Request, res: Response<IResponse<UserAttributes>>) {
    try {
      const result = await this.userServices.getAll();
      // Ensure that a response is sent back to the client
      res.status(200).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.Ok,
        data: result,
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async create(req: Request, res: Response<IResponse<UserAttributes>>) {
    try {
      const result = await this.userServices.create(req.body);
      // Ensure that a response is sent back to the client
      res.status(200).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.Ok,
        data: result,
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }

  async show(req: Request, res: Response<IResponse<UserAttributes>>) {
    try {
      const result = await this.userServices.getById(parseInt(req.params.id, 10));
      res.status(200).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.Ok,
        data: result,
      });
    } catch (err) { ProcessError(err, res); }
  }

  async update(req: Request, res: Response<IResponse<UserAttributes>>) {
    try {
      const result = await this.userServices.update(parseInt(req.params.id, 10), req.body);
      res.status(200).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.Ok,
        data: result,
      });
    } catch (err) { ProcessError(err, res); }
  }

  async destroy(req: Request, res: Response<IResponse<null>>) {
    try {
      await this.userServices.delete(parseInt(req.params.id, 10));
      res.status(204).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.NoContent,
        data: null,
      });
    } catch (err) { ProcessError(err, res); }
  }

  async signIn(req: Request, res: Response<IResponse<any>>) {
    try {
      const result = await this.userServices.signIn(req.body);
      // Ensure that a response is sent back to the client
      res.status(200).json({
        message: messages.SUCCESS,
        statusCode: HttpStatusCode.Ok,
        data: result,
      });
    } catch (err) {
      ProcessError(err, res);
    }
  }
}

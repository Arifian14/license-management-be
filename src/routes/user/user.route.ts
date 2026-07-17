import { Request, Response, Router } from 'express';
import { UserController } from '@controllers/user/user.controller';
import { validationMiddleware } from '@middleware/validation.middleware';
import { CreateUserDto } from '@common/dto/user/CreateUser.dto';
import { UpdateUserDto } from '@common/dto/user/UpdateUser.dto';

export default class userRouter {
  router: Router;
  private userController: UserController;
  constructor() {
    this.router = Router({ mergeParams: true });
    this.userController = new UserController();
    this.serve();
  }

  serve() {
    this.router.route('/')
      .get((req: Request, res: Response) => this.userController.read(req, res))
      .post(validationMiddleware(CreateUserDto), (req: Request, res: Response) => this.userController.create(req, res));
    this.router.route('/:id')
      .get((req: Request, res: Response) => this.userController.show(req, res))
      .put(validationMiddleware(UpdateUserDto), (req: Request, res: Response) => this.userController.update(req, res))
      .delete((req: Request, res: Response) => this.userController.destroy(req, res));
    this.router.route('/sign-in').post((req: Request, res: Response) => this.userController.signIn(req, res));
  }
}

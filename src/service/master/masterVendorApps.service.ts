import MasterVendorApplication from '@database/models/masters/master_vendor_application.model';
import { NotFoundException } from '@helper/Error/NotFound/NotFoundException';
import { CreateVendorDto } from '@common/dto/vendor/CreateVendor.dto';

class MasterVendorApplicationService {
  constructor() {}

  async getById(id: number): Promise<MasterVendorApplication> {
    const results = await MasterVendorApplication.findByPk(id);

    if (!results) {
      throw new NotFoundException('Vendor not found', { id });
    }

    return results;
  }

  async fetchAll(): Promise<MasterVendorApplication[]> {
    return MasterVendorApplication.findAll();
  }

  async create(data: CreateVendorDto): Promise<MasterVendorApplication> {
    return MasterVendorApplication.create({ name: data.name });
  }

  async updateById(id: number, data: CreateVendorDto): Promise<MasterVendorApplication> {
    const vendor = await MasterVendorApplication.findByPk(id);

    if (!vendor) throw new NotFoundException('Vendor not found', { id });
    await vendor.update({ name: data.name });
    
    return vendor;
  }

  async deleteById(id: number): Promise<null> {
    const vendor = await MasterVendorApplication.findByPk(id);

    if (!vendor) throw new NotFoundException('Vendor not found', { id });
    await vendor.destroy();

    return null;
  }
}

export default MasterVendorApplicationService;

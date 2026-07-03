'use strict';

const mergeSeed = require('./utils/mergeSeed');

// Data contoh MSA v2: kontrak PKS-MSA -> role -> personel.
// FK personel: group_id -> master_groups, department_id -> master_departments,
//              vendor_id -> master_vendors, role_id -> v2_msa_has_roles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const pksMsa = [
      { id: 1, pks: 'PKS-MSA-001/2026', file_pks: 'https://drive.example.com/pks/msa-001.pdf', file_bast: 'https://drive.example.com/bast/msa-001.pdf', date_started: '2026-01-01 00:00:00', date_ended: '2026-12-31 23:59:59', people_quota: 10, budget_quota: 500000000.00, threshold_alert: 20 },
      { id: 2, pks: 'PKS-MSA-002/2026', file_pks: 'https://drive.example.com/pks/msa-002.pdf', file_bast: 'https://drive.example.com/bast/msa-002.pdf', date_started: '2026-03-01 00:00:00', date_ended: '2027-02-28 23:59:59', people_quota: 5,  budget_quota: 250000000.00, threshold_alert: 20 },
    ];
    await mergeSeed(queryInterface, 'v2_pks_msa', pksMsa, 'id');

    const roles = [
      { id: 1, pks_msa_id: 1, role: 'Developer',        rate: 15000000.00 },
      { id: 2, pks_msa_id: 1, role: 'QA Engineer',      rate: 12000000.00 },
      { id: 3, pks_msa_id: 2, role: 'Business Analyst', rate: 14000000.00 },
      { id: 4, pks_msa_id: 2, role: 'Developer',        rate: 15000000.00 },
    ];
    await mergeSeed(queryInterface, 'v2_msa_has_roles', roles, 'id');

    // is_active=0 untuk personel yang sudah ada leave_date.
    const personnel = [
      { id: 1, pks_msa_id: 1, role_id: 1, name: 'Budi Santoso',    nik: '3201010101990001', join_date: '2026-01-05 00:00:00', leave_date: null,                  is_active: 1, group_id: 1, department_id: 1, vendor_id: 1 },
      { id: 2, pks_msa_id: 1, role_id: 1, name: 'Sri Lestari',     nik: '3201010202950002', join_date: '2026-01-05 00:00:00', leave_date: null,                  is_active: 1, group_id: 1, department_id: 1, vendor_id: 1 },
      { id: 3, pks_msa_id: 1, role_id: 2, name: 'Andi Wijaya',     nik: '3201010303930003', join_date: '2026-02-01 00:00:00', leave_date: '2026-05-31 23:59:59', is_active: 0, group_id: 2, department_id: 2, vendor_id: 2 },
      { id: 4, pks_msa_id: 2, role_id: 3, name: 'Rina Melati',     nik: '3201010404960004', join_date: '2026-03-05 00:00:00', leave_date: null,                  is_active: 1, group_id: 3, department_id: 3, vendor_id: 3 },
      { id: 5, pks_msa_id: 2, role_id: 4, name: 'Dedi Kurniawan',  nik: '3201010505940005', join_date: '2026-03-05 00:00:00', leave_date: null,                  is_active: 1, group_id: 1, department_id: 1, vendor_id: 1 },
    ];
    await mergeSeed(queryInterface, 'v2_msa', personnel, 'id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('v2_msa', { id: { [Sequelize.Op.in]: [1, 2, 3, 4, 5] } });
    await queryInterface.bulkDelete('v2_msa_has_roles', { id: { [Sequelize.Op.in]: [1, 2, 3, 4] } });
    await queryInterface.bulkDelete('v2_pks_msa', { id: { [Sequelize.Op.in]: [1, 2] } });
  },
};

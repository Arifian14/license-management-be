'use strict';

const mergeSeed = require('./utils/mergeSeed');

// Data contoh Incident. FK:
//   application_id       -> master_applications (1..30)
//   person_in_charge_id  -> master_persons_in_charge (1..14)
//   status_id            -> master_statuses (1=Open, 2=Temporary Action, 3=Full Action2)
module.exports = {
  async up(queryInterface, Sequelize) {
    const incidents = [
      { id: 1, ticket_number: 'FCS20260702-1', entry_date: '2026-07-02 08:15:00', application_id: 1,  person_in_charge_id: 1, issue_code: 'ERR-500', title: 'WISE gagal load dashboard',        detail: 'User tidak bisa membuka halaman dashboard WISE',              status_id: 1, category: 'Bug',          root_cause: 'Timeout koneksi DB',        temporary_action: 'Restart service',            full_action: null,                        note: 'Dipantau',            flag: 1 },
      { id: 2, ticket_number: 'FCS20260701-2', entry_date: '2026-07-01 10:40:00', application_id: 4,  person_in_charge_id: 3, issue_code: 'ERR-403', title: 'FCOS akses ditolak',              detail: 'Sebagian user mendapat error 403 saat submit',               status_id: 2, category: 'Access',       root_cause: 'Konfigurasi role salah',    temporary_action: 'Reset permission user',      full_action: null,                        note: null,                   flag: 1 },
      { id: 3, ticket_number: 'FCS20260628-3', entry_date: '2026-06-28 14:05:00', application_id: 5,  person_in_charge_id: 5, issue_code: 'ERR-DB',  title: 'MCS data tidak tersimpan',        detail: 'Transaksi tidak masuk ke database',                          status_id: 3, category: 'Data',         root_cause: 'Deadlock transaksi',        temporary_action: 'Retry manual',               full_action: 'Perbaikan query + index',   note: 'Selesai deploy',       flag: 1, deploy_date: '2026-06-30 20:00:00' },
      { id: 4, ticket_number: 'FCS20260625-4', entry_date: '2026-06-25 09:00:00', application_id: 6,  person_in_charge_id: 7, issue_code: 'ERR-UI',  title: 'NOS Cicil Emas tombol tidak aktif', detail: 'Tombol simpan tidak merespon di browser tertentu',           status_id: 1, category: 'Bug',          root_cause: null,                        temporary_action: null,                         full_action: null,                        note: null,                   flag: 1 },
      { id: 5, ticket_number: 'FCS20260620-5', entry_date: '2026-06-20 16:30:00', application_id: 8,  person_in_charge_id: 9, issue_code: 'ERR-INT', title: 'Integrasi Paylater gagal',        detail: 'Callback dari partner tidak diterima',                       status_id: 2, category: 'Integration',  root_cause: 'Endpoint partner berubah',  temporary_action: 'Whitelist endpoint baru',    full_action: null,                        note: 'Koordinasi partner',   flag: 1 },
      { id: 6, ticket_number: 'FCS20260615-6', entry_date: '2026-06-15 11:20:00', application_id: 2,  person_in_charge_id: 2, issue_code: 'ERR-PERF',title: 'BCS lambat saat jam sibuk',       detail: 'Response time > 10 detik pada jam 10-11',                    status_id: 3, category: 'Performance',  root_cause: 'Query tanpa index',         temporary_action: 'Tambah cache',               full_action: 'Optimasi query + scaling',  note: 'Selesai',              flag: 1, deploy_date: '2026-06-22 22:00:00' },
    ];
    await mergeSeed(queryInterface, 'incidents', incidents, 'id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('incidents', { id: { [Sequelize.Op.in]: [1, 2, 3, 4, 5, 6] } });
  },
};

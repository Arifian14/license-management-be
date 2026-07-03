'use strict';

const mergeSeed = require('./utils/mergeSeed');

// Data contoh License. Due date dibuat bervariasi relatif terhadap awal Juli 2026
// supaya kartu dashboard menampilkan distribusi status hijau/kuning/merah.
//   merah  (< 30 hari / expired) : id 1, 2
//   kuning (30-90 hari)          : id 3, 4
//   hijau  (>= 90 hari)          : id 5, 6
module.exports = {
  async up(queryInterface, Sequelize) {
    const licenses = [
      { id: 1, pks: 'PKS-LIC-001/2026', application: 'WISE',          vendor_id: 1, date_started: '2024-06-20 00:00:00', due_date_license: '2026-06-20 00:00:00', descriptions: 'Lisensi WISE (sudah jatuh tempo)',      file_pks: 'https://drive.example.com/pks/wise.pdf',    file_bast: 'https://drive.example.com/bast/wise.pdf',    is_notified: 1 },
      { id: 2, pks: 'PKS-LIC-002/2026', application: 'BCS',           vendor_id: 2, date_started: '2024-07-25 00:00:00', due_date_license: '2026-07-25 00:00:00', descriptions: 'Lisensi BCS (segera habis < 1 bulan)',   file_pks: 'https://drive.example.com/pks/bcs.pdf',     file_bast: 'https://drive.example.com/bast/bcs.pdf',     is_notified: 1 },
      { id: 3, pks: 'PKS-LIC-003/2026', application: 'FCOS',          vendor_id: 3, date_started: '2024-08-20 00:00:00', due_date_license: '2026-08-20 00:00:00', descriptions: 'Lisensi FCOS (habis 1-3 bulan)',        file_pks: 'https://drive.example.com/pks/fcos.pdf',    file_bast: 'https://drive.example.com/bast/fcos.pdf',    is_notified: 1 },
      { id: 4, pks: 'PKS-LIC-004/2026', application: 'MCS',           vendor_id: 1, date_started: '2024-09-15 00:00:00', due_date_license: '2026-09-15 00:00:00', descriptions: 'Lisensi MCS (habis 1-3 bulan)',         file_pks: 'https://drive.example.com/pks/mcs.pdf',     file_bast: 'https://drive.example.com/bast/mcs.pdf',     is_notified: 1 },
      { id: 5, pks: 'PKS-LIC-005/2026', application: 'NOS Cicil Emas', vendor_id: 2, date_started: '2024-12-10 00:00:00', due_date_license: '2026-12-10 00:00:00', descriptions: 'Lisensi NOS Cicil Emas (aman)',        file_pks: 'https://drive.example.com/pks/nos-ce.pdf',  file_bast: 'https://drive.example.com/bast/nos-ce.pdf',  is_notified: 1 },
      { id: 6, pks: 'PKS-LIC-006/2026', application: 'APPEL IKURMA',  vendor_id: 3, date_started: '2025-02-01 00:00:00', due_date_license: '2027-02-01 00:00:00', descriptions: 'Lisensi APPEL IKURMA (aman)',          file_pks: 'https://drive.example.com/pks/ikurma.pdf',  file_bast: 'https://drive.example.com/bast/ikurma.pdf',  is_notified: 1 },
    ];
    await mergeSeed(queryInterface, 'licenses', licenses, 'id');

    const healthchecks = [
      { id: 1, license_id: 1, healthcheck_routine_date: '2026-01-15 00:00:00', healthcheck_actual_date: '2026-01-16 00:00:00' },
      { id: 2, license_id: 1, healthcheck_routine_date: '2026-04-15 00:00:00', healthcheck_actual_date: '2026-04-18 00:00:00' },
      { id: 3, license_id: 3, healthcheck_routine_date: '2026-03-01 00:00:00', healthcheck_actual_date: '2026-03-03 00:00:00' },
      { id: 4, license_id: 5, healthcheck_routine_date: '2026-05-10 00:00:00', healthcheck_actual_date: null },
    ];
    await mergeSeed(queryInterface, 'license_healthchecks', healthchecks, 'id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('license_healthchecks', { id: { [Sequelize.Op.in]: [1, 2, 3, 4] } });
    await queryInterface.bulkDelete('licenses', { id: { [Sequelize.Op.in]: [1, 2, 3, 4, 5, 6] } });
  },
};

require('./src/config/env');
const { Pool } = require('pg');

async function testMainDatabase() {
  console.log('================================================================');
  console.log('1. KIỂM TRA ĐỌC DỮ LIỆU TỪ CSDL CHÍNH (MAYDAY - 160.191.46.107)');
  console.log('================================================================');

  const connectionString =
    process.env.MAIN_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable`;

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    const infoRes = await pool.query('SELECT current_database(), current_user, version()');
    console.log(`✅ Kết nối CSDL Chính THÀNH CÔNG!`);
    console.log(`   - Database: ${infoRes.rows[0].current_database}`);
    console.log(`   - User: ${infoRes.rows[0].current_user}`);
    console.log(`   - PostgreSQL Version: ${infoRes.rows[0].version.split(',')[0]}`);

    // Đọc số lượng bảng
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);
    console.log(`\n📊 Tìm thấy ${tablesRes.rows.length} bảng trong schema public.`);

    // Đọc dữ liệu từ một số bảng chính
    const testTables = ['vaitro', 'nguoi', 'taikhoan', 'benhnhan', 'hosobenhan', 'phienkham', 'thuoc', 'chinhanh'];
    for (const tbl of testTables) {
      try {
        const countRes = await pool.query(`SELECT count(*) FROM public."${tbl}"`);
        const count = countRes.rows[0].count;
        console.log(`   • Bảng [${tbl}]: ${count} bản ghi`);

        if (parseInt(count, 10) > 0) {
          const sample = await pool.query(`SELECT * FROM public."${tbl}" LIMIT 2`);
          console.log(`     -> Mẫu: ${JSON.stringify(sample.rows[0])}`);
        }
      } catch (e) {
        console.log(`   • Bảng [${tbl}]: Lỗi đọc (${e.message})`);
      }
    }
  } catch (err) {
    console.error(`❌ Lỗi kết nối CSDL Chính: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function testSubDatabase() {
  console.log('\n================================================================');
  console.log('2. KIỂM TRA ĐỌC & GHI DỮ LIỆU TRÊN SUB DATABASE (SUPABASE)');
  console.log('================================================================');

  const subConnectionString = process.env.SUB_DATABASE_URL;
  if (!subConnectionString) {
    console.log('⚠️ Chưa cấu hình SUB_DATABASE_URL trong .env');
    return;
  }

  const pool = new Pool({
    connectionString: subConnectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    const infoRes = await pool.query('SELECT current_database(), current_user, version()');
    console.log(`✅ Kết nối Sub Database Supabase THÀNH CÔNG!`);
    console.log(`   - Database: ${infoRes.rows[0].current_database}`);
    console.log(`   - User: ${infoRes.rows[0].current_user}`);

    // Tạo bảng test_sub_connection nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.test_sub_connection (
        id SERIAL PRIMARY KEY,
        ghi_chu TEXT NOT NULL,
        thoi_diem TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ghi dữ liệu test
    const note = `DrMayDay write test lúc ${new Date().toISOString()}`;
    const insertRes = await pool.query(
      'INSERT INTO public.test_sub_connection (ghi_chu) VALUES ($1) RETURNING *',
      [note]
    );
    console.log(`\n✍️ GHI dữ liệu vào Sub DB thành công! ID = ${insertRes.rows[0].id}`);

    // Đọc dữ liệu test
    const selectRes = await pool.query('SELECT * FROM public.test_sub_connection ORDER BY id DESC LIMIT 3');
    console.log(`📖 ĐỌC dữ liệu từ Sub DB thành công! (${selectRes.rows.length} bản ghi gần nhất):`);
    selectRes.rows.forEach(r => {
      console.log(`   • [ID ${r.id}] ${r.ghi_chu} (${r.thoi_diem})`);
    });

  } catch (err) {
    console.error(`❌ Lỗi Sub Database: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  await testMainDatabase();
  await testSubDatabase();
  console.log('\n================================================================');
  console.log('🎉 HOÀN TẤT KIỂM TRA!');
  console.log('================================================================');
}

main();

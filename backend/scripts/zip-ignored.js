/**
 * SCRIPT ĐÓNG GÓI CÁC FILE/FOLDER BỊ GITIGNORE ĐỂ GỬI CHO NHÓM
 * Lệnh chạy: npm run zip:ignored
 * File đầu ra: drmayday-system/team_shared_bundle.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../');
const zipFileName = 'team_shared_bundle.zip';
const zipFilePath = path.join(rootDir, zipFileName);
const stagingDir = path.join(rootDir, '.bundle_staging');

// Danh sách các file/folder bị gitignore cần đóng gói để gửi cho thành viên (trừ node_modules)
const candidateItems = [
  '.agents',
  '.env',
  'AGENTS.md',
  'From hospital',
  'Slide APIs',
  'docs',
  path.join('bruno', 'environments', 'Local.bru'),
];

console.log('================================================================');
console.log('📦 BẮT ĐẦU ĐÓNG GÓI CÁC FILE/FOLDER GITIGNORE ĐỂ GỬI CHO NHÓM...');
console.log('================================================================\n');

// 1. Kiểm tra các mục thực tế đang tồn tại trong thư mục gốc
const itemsToZip = [];
for (const item of candidateItems) {
  const fullPath = path.join(rootDir, item);
  if (fs.existsSync(fullPath)) {
    itemsToZip.push(item);
    console.log(`  ✓ Đã chọn: ${item}`);
  }
}

if (itemsToZip.length === 0) {
  console.log('⚠️ Không tìm thấy file hoặc thư mục nào cần đóng gói!');
  process.exit(0);
}

// Xóa file zip cũ nếu đã tồn tại
if (fs.existsSync(zipFilePath)) {
  try {
    fs.unlinkSync(zipFilePath);
  } catch (_) {}
}

console.log(`\n⏳ Đang chuẩn bị và nén thành file: ${zipFileName}...`);

try {
  // Chuẩn bị thư mục staging tạm thời để giữ nguyên đúng cấu trúc thư mục con (ví dụ bruno/environments/Local.bru)
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const item of itemsToZip) {
    const src = path.join(rootDir, item);
    const dest = path.join(stagingDir, item);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }

  if (process.platform === 'win32') {
    // Trên Windows: Dùng PowerShell Compress-Archive nén nội dung thư mục staging
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    // Trên Linux / macOS: Dùng lệnh zip
    execSync(`cd "${stagingDir}" && zip -r "${zipFilePath}" .`, { stdio: 'inherit' });
  }

  // Dọn dẹp thư mục staging tạm thời
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  if (fs.existsSync(zipFilePath)) {
    const stats = fs.statSync(zipFilePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('\n================================================================');
    console.log('🎉 ĐÓNG GÓI THÀNH CÔNG!');
    console.log(`📁 Đường dẫn file ZIP: ${zipFilePath}`);
    console.log(`⚖️ Dung lượng: ${sizeMB} MB`);
    console.log('👉 Bạn có thể kéo thả file team_shared_bundle.zip vào khung chat nhóm để gửi ngay!');
    console.log('================================================================');
  }
} catch (err) {
  // Dọn dẹp staging nếu có lỗi
  if (fs.existsSync(stagingDir)) {
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (_) {}
  }
  console.error('\n❌ Lỗi khi đóng gói file ZIP:', err.message);
}

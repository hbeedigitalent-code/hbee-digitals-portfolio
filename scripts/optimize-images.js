const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const inputDir = './public/images';
const outputDir = './public/images/optimized';

// Image formats to generate (WebP and AVIF)
const formats = ['webp', 'avif'];

// Responsive sizes for different breakpoints
const sizes = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048];

// Quality settings
const quality = {
  webp: 80,
  avif: 75,
};

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Supported image extensions
const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else if (supportedExtensions.includes(path.extname(file).toLowerCase())) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

async function optimizeImage(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const relativePath = path.relative(inputDir, path.dirname(filePath));
  const outputSubDir = path.join(outputDir, relativePath);
  
  // Create subdirectory if needed
  if (!fs.existsSync(outputSubDir)) {
    fs.mkdirSync(outputSubDir, { recursive: true });
  }
  
  const imageBuffer = fs.readFileSync(filePath);
  const metadata = await sharp(imageBuffer).metadata();
  
  console.log(`📸 Processing: ${fileName} (${metadata.width}x${metadata.height})`);
  
  for (const format of formats) {
    // Generate different sizes
    for (const size of sizes) {
      if (size > metadata.width) continue; // Skip sizes larger than original
      
      const outputFileName = `${fileName}-${size}.${format}`;
      const outputPath = path.join(outputSubDir, outputFileName);
      
      await sharp(imageBuffer)
        .resize(size, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        [format]({ 
          quality: quality[format],
          effort: 6,
        })
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ ${format.toUpperCase()}: ${outputFileName} (${sizeKB} KB)`);
    }
  }
}

async function main() {
  console.log('🚀 Starting image optimization...\n');
  
  // Check if input directory exists
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    console.log('📁 Please create the directory and add your images first.');
    return;
  }
  
  const images = getAllImageFiles(inputDir);
  
  if (images.length === 0) {
    console.log('⚠️ No images found in', inputDir);
    console.log('📁 Please add images to the /public/images/ folder');
    return;
  }
  
  console.log(`📷 Found ${images.length} image(s) to optimize\n`);
  
  for (const image of images) {
    await optimizeImage(image);
  }
  
  console.log('\n🎉 Image optimization complete!');
  console.log('\n📖 How to use optimized images:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
<picture>
  <source 
    type="image/avif" 
    srcset="/images/optimized/your-image-320.avif 320w,
            /images/optimized/your-image-640.avif 640w,
            /images/optimized/your-image-750.avif 750w,
            /images/optimized/your-image-1080.avif 1080w"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw">
  <source 
    type="image/webp" 
    srcset="/images/optimized/your-image-320.webp 320w,
            /images/optimized/your-image-640.webp 640w,
            /images/optimized/your-image-750.webp 750w,
            /images/optimized/your-image-1080.webp 1080w"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw">
  <img 
    src="/images/your-image.jpg" 
    alt="Description"
    loading="lazy"
    width="800"
    height="600">
</picture>
  `);
}

main().catch(console.error);
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const TILESIZES = [36, 144];
const OUTPUT_DIR = path.join(__dirname, 'static', 'sprites');
const BASE_IMAGE_DIR = path.join(__dirname, 'static', 'tiles');

// Placeholder for image processing logic and generation loops
async function main() {
  console.log('Starting image processing...');

  // Ensure output directory exists (Step 5)
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`Creating output directory: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load image names (Step 2)
  const creatures = require('./creatures.json');
  const items = require('./items.json');

  const staticImageNames = [
    'none', 'wall', 'floor', 'stairup', 'stairdown', 
    'potion', 'ring', 
    'decal1', 'decal2', 'decal3', 'decal4', 'decal5', 
    'decal6', 'decal7', 'decal8', 'decal9'
  ];

  const noCorpseCreatures = [
    "player", "goblinsoldier", "goblinshaman", 
    "orcslave", "orcsoldier", "orccaptain", "orcshaman"
  ];

  // Implement image processing function (Step 3)
  async function processAndSaveImage(imageof, tilesize, outputDir, baseImageDir) {
    const canvas = createCanvas(tilesize, tilesize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, tilesize, tilesize);

    if (imageof !== 'none') {
      try {
        const originalImagePath = path.join(baseImageDir, `${imageof}.png`);
        if (!fs.existsSync(originalImagePath)) {
          console.warn(`Warning: Original image not found for "${imageof}" at ${originalImagePath}. Skipping.`);
          return;
        }
        const original = await loadImage(originalImagePath);
        ctx.drawImage(original, 0, 0, tilesize, tilesize);
      } catch (imgError) {
        console.error(`Error loading image ${imageof} (path: ${path.join(baseImageDir, `${imageof}.png`)}):`, imgError.message);
        return; // Skip this image if loading failed
      }
    } else {
      ctx.fillStyle = "#000000"; // Black background for 'none'
      ctx.fillRect(0, 0, tilesize, tilesize);
    }

    const buffer = canvas.toBuffer('image/png');
    const outputFilePath = path.join(outputDir, `${imageof}${tilesize}.png`);

    try {
      fs.writeFileSync(outputFilePath, buffer);
      // console.log(`Successfully generated: ${outputFilePath}`); // Optional: for verbose logging
    } catch (writeError) {
      console.error(`Error writing file ${outputFilePath}:`, writeError);
    }
  }

  // Generate images (Step 4)
  console.log(`Processing images for tilesizes: ${TILESIZES.join(', ')}`);
  for (const tilesize of TILESIZES) {
    console.log(`\nGenerating images for tilesize: ${tilesize}`);

    // Process static images
    console.log('Processing static images...');
    for (const name of staticImageNames) {
      await processAndSaveImage(name, tilesize, OUTPUT_DIR, BASE_IMAGE_DIR);
    }

    // Process creatures and their corpses
    console.log('Processing creature images...');
    for (const creature of creatures) {
      await processAndSaveImage(creature.creaturetype, tilesize, OUTPUT_DIR, BASE_IMAGE_DIR);
      if (!noCorpseCreatures.includes(creature.creaturetype)) {
        const corpseName = creature.creaturetype + 'corpse';
        await processAndSaveImage(corpseName, tilesize, OUTPUT_DIR, BASE_IMAGE_DIR);
      }
    }

    // Process items (excluding those already covered by staticImageNames like 'potion', 'ring')
    console.log('Processing item images...');
    const miscItemClasses = ["potion", "ring"]; // Already handled in staticImageNames
    for (const item of items) {
      if (!miscItemClasses.includes(item.class)) {
        // Assuming item.name is the image identifier, as seen in images.ejs
        await processAndSaveImage(item.name, tilesize, OUTPUT_DIR, BASE_IMAGE_DIR);
      }
    }
  }
  console.log('\nAll image processing tasks submitted.');
  console.log('Image processing complete.');
}

main().catch(err => {
  console.error('Error during image processing:', err);
  process.exit(1);
});

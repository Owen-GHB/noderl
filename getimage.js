const express = require('express');
const router = express.Router();
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

router.get('/', async (req, res) => {
  const tilesize = parseInt(req.query.tilesize, 10);
  const imageof = req.query.imageof;

  const canvas = createCanvas(tilesize, tilesize);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, tilesize, tilesize);

  if (imageof !== 'none') {
    const original = await loadImage(path.join(__dirname, `static/tiles/${imageof}.png`));
    ctx.drawImage(original, 0, 0, tilesize, tilesize);
  } else {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, tilesize, tilesize);
  }

  const imageData = canvas.toDataURL('image/png');
  const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

  const buffer = Buffer.from(base64Data, 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buffer.length
  });
  res.end(buffer);
});

module.exports = router;
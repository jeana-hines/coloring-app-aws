const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
fsPromises = fs.promises;
const path = require('path');
const cors = require('cors');

app.use(cors());

async function readImages() {
    const imagesDir = path.join(__dirname, 'images', 'coloring');
    const files = await fsPromises.readdir(imagesDir);
    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.png';
    });
}


// Route to get list of images from images/coloring directory.
app.get('/coloringapp3/api/coloring-images', async (req, resp) => {
    try {
        const images = await readImages();
        resp.json(images);
    } catch (error) {
        console.error('Error reading images:', error);
        resp.status(500).send('Error reading images');;
    }
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
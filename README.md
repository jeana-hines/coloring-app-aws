# Digital Coloring Book

A responsive, web-based coloring application built with React and Vite. This app features a layered canvas system that allows users to paint under line art, zoom/pan for detail work, and save their progress locally.

## Features

- **Layered Canvas**: High-resolution 1024x1024 drawing system where paint appears beneath the black lines.
- **Mobile Optimized**: Custom touch handlers for a smooth experience on iPad and tablets.
- **Smart Tools**: Includes a brush with adjustable size and hardness, a pan tool for navigation, and a color picker.
- **Persistence**: Automatically saves your progress to LocalStorage so you don't lose your work when switching pages.
- **History & Export**: Undo support (up to 50 strokes) and a download button to save your finished artwork as a PNG.

## Tech Stack

- **Framework**: React
- **Build Tool**: Vite
- **Styling**: Tailwind CSS & Custom CSS
- **Canvas API**: HTML5 Canvas for high-performance rendering

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/colorapp2.git](https://github.com/your-username/colorapp2.git)
   cd colorapp2

2. **Install dependencies**
    ```bash
        npm install
    
3. **Start development server**
    ```bash
        npm run dev

4. **Open your browser:**
    Navigate to the local URL provided by Vite (usually http://localhost:5173).

## Project Structure
- src/App.jsx: The main application logic and UI.

- public/colorapp2/images/coloring/: Directory for your line art images.

- public/colorapp2/image_list.txt: A text file containing the names of available images to load.

## Adding New Coloring Pages

1. Create your line art as a PNG. It should be completely transparent except for the lines of the drawing.

2. Add your line art PNGs to public/colorapp2/images/coloring/.

3. Add the filename (e.g., my_new_picture.png) to a new line in public/colorapp2/image_list.txt.

4. The app will automatically detect and display the new page in the selector.

## License
Distributed under the MIT License.
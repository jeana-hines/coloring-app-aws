import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- PLACEHOLDER SVG COMPONENTS ---
// You must replace these with your actual SVG imports or <img /> tags.
const BrushSVG = () => (
    <img src="images/UI/brush.svg" alt="Brush Tools" style={{width:35, height: 35}}/>
);
const DownloadSVG = () => (
    <img src="images/UI/download.svg" alt="Brush Tools" style={{width:35, height: 35}}/>
);
const UndoSVG = () => (
    <img src="images/UI/undo.svg" alt="Brush Tools" style={{width:35, height: 35}}/>
);
// Pan/Hand Tool Icon
const PanSVG = () => (
    <img src="images/UI/pan.svg" alt="Brush Tools" style={{width:35, height: 35}}/>
);
// --- END PLACEHOLDER SVG COMPONENTS ---


// --- CONFIGURATION ---

const CANVAS_SIZE = 1024; 
const IMAGE_LIST_FILE = '/colorapp2/image_list.txt'; 
const IMAGE_BASE_PATH = '/colorapp2/images/coloring/'; 

// --- COLORING CANVAS LOGIC HOOK (Self-Contained) ---

function useCanvasDrawing(selectedImageName, activeTool, wrapperRef) {
  const drawingCanvasRef = useRef(null); 
  const lineCanvasRef = useRef(null);    

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [hardness, setHardness] = useState(100); 
  
  const [drawingContext, setDrawingContext] = useState(null); 
  const [lineContext, setLineContext] = useState(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); 
  
  const [history, setHistory] = useState([]);
  const MAX_HISTORY_SIZE = 50; 

  const STORAGE_KEY = `coloring_progress_${selectedImageName}`;
  
  const [zoomLevel, setZoomLevel] = useState(1.0); 

  // Apply both zoom and pan offset
  const applyTransform = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      // Order is important: translate first, then scale
      wrapper.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
      wrapper.style.transformOrigin = '0 0';
    }
  }, [zoomLevel, panOffset, wrapperRef]);
  
  // UseEffect to apply transform whenever zoom or pan changes
  useEffect(() => {
    applyTransform();
  }, [zoomLevel, panOffset, applyTransform]);


  const getImageUrl = useCallback((name) => {
    if (!name) return null;
    const IMAGE_BASE_PATH = '/colorapp2/images/coloring/';
    return IMAGE_BASE_PATH + name;
  }, []);


  const saveProgress = useCallback(() => {
    if (!drawingCanvasRef.current) return;
    try {
        const dataURL = drawingCanvasRef.current.toDataURL('image/png');
        localStorage.setItem(STORAGE_KEY, dataURL);
    } catch (e) {
        console.error("Error saving to localStorage:", e);
    }
  }, [selectedImageName, STORAGE_KEY]);


  const saveHistory = useCallback(() => {
    if (!drawingCanvasRef.current) return;
    const dataURL = drawingCanvasRef.current.toDataURL('image/png');
    setHistory(prevHistory => {
        const newHistory = [...prevHistory, dataURL];
        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift(); 
        }
        return newHistory;
    });
  }, []);

  const undoStroke = useCallback(() => {
    if (history.length > 1 && drawingContext) {
        
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);
        
        const restoreDataURL = newHistory[newHistory.length - 1]; 
        
        if (restoreDataURL) {
            const img = new Image();
            img.onload = () => {
                const canvas = drawingCanvasRef.current;
                if (!canvas) return;
                
                drawingContext.clearRect(0, 0, canvas.width, canvas.height);
                drawingContext.globalAlpha = 1.0;
                drawingContext.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                saveProgress(); 
            };
            img.src = restoreDataURL;
        } 
    }
  }, [history, drawingContext, saveProgress]);


  const loadImageToCanvas = useCallback((imageName) => {
    const url = getImageUrl(imageName);
    const dCanvas = drawingCanvasRef.current;
    const lCanvas = lineCanvasRef.current;
    
    if (!dCanvas || !lCanvas || !url) return;

    const dCtx = dCanvas.getContext('2d');
    const lCtx = lCanvas.getContext('2d');
    setDrawingContext(dCtx);
    setLineContext(lCtx);

    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    
    dCanvas.width = lCanvas.width = CANVAS_SIZE;
    dCanvas.height = lCanvas.height = CANVAS_SIZE;
    
    img.onload = () => {
      lCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      lCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE); 

      // 1. Check for saved progress FIRST
      const savedDataURL = localStorage.getItem(STORAGE_KEY);
      
      if (savedDataURL) {
          const savedImg = new Image();
          savedImg.onload = () => {
              dCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); // Clear before drawing saved work
              dCtx.globalAlpha = 1.0;
              dCtx.drawImage(savedImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
              setHistory([dCanvas.toDataURL('image/png')]); // Set history AFTER drawing
          };
          savedImg.src = savedDataURL;
      } else {
          // 2. ONLY fill with white if there is no saved progress
          dCtx.fillStyle = '#ffffff'; 
          dCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); 
          setHistory([dCanvas.toDataURL('image/png')]);
      }
    };
    
    img.onerror = () => {
        lCtx.fillStyle = '#ffdddd';
        lCtx.fillRect(0, 0, lCanvas.width, lCanvas.height);
        lCtx.fillStyle = '#cc0000';
        lCtx.textAlign = 'center';
        lCtx.font = '20px sans-serif';
        lCtx.fillText(`Error: Image "${imageName}" not found.`, lCanvas.width / 2, lCtx.height / 2 - 20);
        lCtx.fillText(`Check folder: ${IMAGE_BASE_PATH}`, lCanvas.width / 2, lCtx.height / 2 + 20);
        setHistory([]); 
    };
    img.src = url;
  }, [getImageUrl, STORAGE_KEY]); 

  useEffect(() => {
    if (selectedImageName) {
        loadImageToCanvas(selectedImageName);
    }
  }, [selectedImageName, loadImageToCanvas]);

  // Helper to get client coordinates (for panning)
  const getClientCoordinates = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { clientX, clientY };
  };
  
  // Helper to get canvas pixel coordinates (for drawing)
  const getCanvasCoordinates = (e) => {
    const canvas = drawingCanvasRef.current; 
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getClientCoordinates(e);

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Use scale to map client coordinates to internal canvas coordinates (1024x1024)
    return {
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY,
    };
  };

  const drawStamp = useCallback((ctx, x, y) => {
    const outerRadius = brushSize / 2;
    const hardCoreRatio = hardness / 100; 
    const stampAlpha = 0.1 + (hardness / 100) * 0.9; 
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
    
    gradient.addColorStop(0, color); 
    
    if (hardCoreRatio > 0) {
        gradient.addColorStop(hardCoreRatio, color); 
    }
    
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = stampAlpha; 
    
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
  }, [color, brushSize, hardness]); 
  
  // --- UNIFIED INTERACTION HANDLERS ---
  
  const startInteraction = (e) => {
    if (!drawingContext) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    
    const { clientX, clientY } = getClientCoordinates(e);

    if (activeTool === 'brush') {
        const { x, y } = getCanvasCoordinates(e); 
        setLastPos({ x, y });
        setIsDrawing(true);
        drawStamp(drawingContext, x, y); 
        e.preventDefault(); 
    } else if (activeTool === 'pan' && zoomLevel > 0.5) {
        // Only allow panning if zoomed in
        setLastPos({ x: clientX, y: clientY });
        setIsPanning(true);
        /* e.preventDefault(); */
    }
  };

  const moveInteraction = (e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    if (activeTool === 'brush' && isDrawing) {
        const { x, y } = getCanvasCoordinates(e);
        const dist = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));
        
        const angle = Math.atan2(y - lastPos.y, x - lastPos.x);
        const spacing = brushSize * 0.25; 
        
        for (let i = spacing; i < dist; i += spacing) {
            const stampX = lastPos.x + Math.cos(angle) * i;
            const stampY = lastPos.y + Math.sin(angle) * i;
            drawStamp(drawingContext, stampX, stampY);
        }
        
        drawStamp(drawingContext, x, y); 
        setLastPos({ x, y });
        /* e.preventDefault(); */
        
    } else if (activeTool === 'pan' && isPanning) {
        const { clientX, clientY } = getClientCoordinates(e);
        
        const dx = clientX - lastPos.x;
        const dy = clientY - lastPos.y;

        setPanOffset(prev => ({
            x: prev.x + dx,
            y: prev.y + dy
        }));

        setLastPos({ x: clientX, y: clientY });
        /* e.preventDefault(); */
    }
  };

  const stopInteraction = () => {
    if (isDrawing) {
        setIsDrawing(false);
        saveHistory(); 
        saveProgress();
    }
    if (isPanning) {
        setIsPanning(false);
    }
  };

  const clearCanvas = () => {
    if (drawingContext && drawingCanvasRef.current) {
      const width = drawingCanvasRef.current.width;
      const height = drawingCanvasRef.current.height;

      drawingContext.clearRect(0, 0, width, height);
      drawingContext.fillStyle = '#ffffff'; 
      drawingContext.fillRect(0, 0, width, height);

      saveHistory(); 
      saveProgress(); 
    }
  };
  
  const reloadLineArt = useCallback(() => {
    const imageName = selectedImageName;
    const url = getImageUrl(imageName);
    const lCanvas = lineCanvasRef.current;
    
    if (!lCanvas || !url || !lineContext) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    
    img.onload = () => {
      lContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      lContext.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE); 
      console.log(`Line art reloaded for: ${imageName}`);
    };
    
    img.onerror = () => {
        console.error(`Error reloading line art for: ${imageName}`);
    };
    img.src = url;

  }, [selectedImageName, getImageUrl, lineContext]);


  // UseEffect to bind unified handlers
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startInteraction);
    canvas.addEventListener('mousemove', moveInteraction);
    canvas.addEventListener('mouseup', stopInteraction);
    canvas.addEventListener('mouseleave', stopInteraction);
    canvas.addEventListener('touchstart', startInteraction, { passive: false });
    canvas.addEventListener('touchmove', moveInteraction, { passive: false }); 
    canvas.addEventListener('touchend', stopInteraction, { passive: false });
    canvas.addEventListener('touchcancel', stopInteraction);

    return () => {
      canvas.removeEventListener('mousedown', startInteraction);
      canvas.removeEventListener('mousemove', moveInteraction);
      canvas.removeEventListener('mouseup', stopInteraction);
      canvas.removeEventListener('mouseleave', stopInteraction);
      canvas.removeEventListener('touchstart', startInteraction, { passive: false });
      canvas.removeEventListener('touchmove', moveInteraction, { passive: false });
      canvas.removeEventListener('touchend', stopInteraction, { passive: false });
      canvas.removeEventListener('touchcancel', stopInteraction);
    };
  }, [startInteraction, moveInteraction, stopInteraction]); 
  
  // Clean up pan offset when image changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [selectedImageName]);


  return {
    drawingCanvasRef, 
    lineCanvasRef,    
    color,
    setColor,
    brushSize,
    setBrushSize,
    hardness,         
    setHardness,      
    clearCanvas,
    undoStroke, 
    canUndo: history.length > 1,
    zoomLevel,
    setZoomLevel,
    reloadLineArt,
  };
}


// --- ImageThumbnailSelector (UNCHANGED) ---
function ImageThumbnailSelector({ availableImages, selectedImage, setSelectedImage }) {
    
    const getThumbnailUrl = (name) => {
        return IMAGE_BASE_PATH + name;
    };

    return (
        <div className="thumbnail-selector-container">
            <h3 className="font-semibold text-lg mb-3">CHOOSE COLORING PAGE:</h3>
            <div className="thumbnail-list">
                {availableImages.map(name => {
                    const displayLabel = name.replace(/_/g, ' ').replace(/\.\w+$/, '');

                    return (
                        <div 
                            key={name}
                            className={`thumbnail-item ${selectedImage === name ? 'selected' : ''}`}
                            onClick={() => setSelectedImage(name)}
                            aria-label={`Select coloring page: ${displayLabel}`}
                            role="button"
                            tabIndex="0"
                        >
                            <img 
                                src={getThumbnailUrl(name)} 
                                alt={displayLabel} 
                                className="thumbnail-image"
                            />
                            <p className="thumbnail-label">{displayLabel}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [availableImages, setAvailableImages] = useState([]); 
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [activeTool, setActiveTool] = useState('brush'); 
  const [showBrushControls, setShowBrushControls] = useState(true); 
  
  const canvasWrapperRef = useRef(null); 

  // --- Dynamic Image List Fetch from Static TXT File (UNCHANGED) ---
useEffect(() => {
  setLoadingImages(true);
  
  fetch(IMAGE_LIST_FILE)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${IMAGE_LIST_FILE}. Status: ${response.status}`);
      }
      return response.text(); 
    })
    .then(text => {
      const imageList = text
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0);
      
      setAvailableImages(imageList);
      if (imageList.length > 0) {
           setSelectedImage(imageList[0]);
      }
    })
    .catch(error => {
      console.error("Error fetching image list from TXT:", error.message);
      setAvailableImages([]);
    })
    .finally(() => {
      setLoadingImages(false);
    });
}, []); 
// --- End of Dynamic Fetch ---

  // Use the custom hook to handle canvas interactions
  const {
    drawingCanvasRef, 
    lineCanvasRef,    
    color,
    setColor,
    brushSize,
    setBrushSize,
    clearCanvas,
    hardness, 
    setHardness, 
    undoStroke, 
    canUndo,
    zoomLevel,
    setZoomLevel,
    reloadLineArt,
  } = useCanvasDrawing(selectedImage, activeTool, canvasWrapperRef); 
  
  
  // 💡 MODIFIED: More robust tool change handler
  const handleToolChange = (tool) => {
    if (tool === 'brush') {
      if (activeTool === 'brush') {
        // If brush is already active, toggle the visibility of the settings panel
        setShowBrushControls(prev => !prev);
      } else {
        // If switching from Pan to Brush, make Brush the active tool and show settings
        setActiveTool('brush');
        setShowBrushControls(true);
      }
    } else if (tool === 'pan') {
      // If switching to Pan, set tool and hide brush settings
      setActiveTool('pan');
      setShowBrushControls(false);
    }
  };


  // --- DRAGGABLE TOOLBOX LOGIC (UNCHANGED) ---
  
useEffect(() => {
    // Existing drag logic...
    const toolsPanel = document.querySelector('.coloring-tools');
    const dragHandle = document.querySelector('.drag-handle');
    const container = document.querySelector('.drawing-area-container'); 

    if (!toolsPanel || !dragHandle || !container) {
        console.warn("Drag functionality elements missing. Check for .coloring-tools, .drag-handle, or .drawing-area-container.");
        return;
    }

    let isDragging = false;
    let offset = { x: 0, y: 0 };

    const isPanelFloating = () => {
        const computedStyle = window.getComputedStyle(toolsPanel);
        return computedStyle.position === 'fixed'; 
    };

    const getClientCoordinates = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return { clientX, clientY };
    };

    const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        toolsPanel.style.transition = ''; 
        toolsPanel.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; 

        document.removeEventListener('mousemove', dragging);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', dragging);
        document.removeEventListener('touchend', dragEnd);
        document.removeEventListener('touchcancel', dragEnd);
    };

    const dragging = (e) => {
        if (!isDragging || !isPanelFloating()) return;
        e.preventDefault(); 

        const { clientX, clientY } = getClientCoordinates(e);
        const panelWidth = toolsPanel.offsetWidth;
        const panelHeight = toolsPanel.offsetHeight;

        let newX = clientX - offset.x;
        let newY = clientY - offset.y;

        newX = Math.max(0, newX);
        newX = Math.min(newX, window.innerWidth - panelWidth); 
        newY = Math.max(0, newY);
        newY = Math.min(newY, window.innerHeight - panelHeight);
        
        toolsPanel.style.left = `${newX}px`;
        toolsPanel.style.top = `${newY}px`;
        toolsPanel.style.transform = `none`; 
    };

    const dragStart = (e) => {
        if (!isPanelFloating()) return;
        if (e.type === 'mousedown' && e.button !== 0) return;

        isDragging = true;
        e.preventDefault(); 

        const { clientX, clientY } = getClientCoordinates(e);
        if (clientX === undefined || clientY === undefined) {
            isDragging = false;
            return;
        }

        const panelRect = toolsPanel.getBoundingClientRect();
        
        toolsPanel.style.transform = 'none'; 
        toolsPanel.style.left = `${panelRect.left}px`;
        toolsPanel.style.top = `${panelRect.top}px`;

        offset.x = clientX - panelRect.left;
        offset.y = clientY - panelRect.top;

        toolsPanel.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2)';
        toolsPanel.style.transition = 'none'; 

        document.addEventListener('mousemove', dragging);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', dragging, { passive: false });
        document.addEventListener('touchend', dragEnd);
        document.addEventListener('touchcancel', dragEnd);
    };

    const setInitialPosition = () => {
        if (isPanelFloating()) {
            toolsPanel.style.transform = 'translateY(-50%)'; 
            toolsPanel.style.left = '20px'; 
            toolsPanel.style.top = '50%'; 
        } else {
            toolsPanel.style.left = '';
            toolsPanel.style.top = '';
            toolsPanel.style.transform = '';
            dragEnd(); 
        }
    };
    
    dragHandle.addEventListener('mousedown', dragStart);
    dragHandle.addEventListener('touchstart', dragStart, { passive: false });
    
    window.addEventListener('resize', setInitialPosition);
    setInitialPosition();

    return () => {
        dragHandle.removeEventListener('mousedown', dragStart);
        dragHandle.removeEventListener('touchstart', dragStart);
        window.removeEventListener('resize', setInitialPosition);
        dragEnd(); 
    };
}, []); 

  // --- RENDERING THE APP UI ---
  return (
    <div className="">
      <style>
        {`
        
        .mainwrapper {
          width: 1200px;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        
        /* --- Canvas Layering Styles (FIXED 1:1 RATIO) --- */
        .canvas-wrapper {
            position: relative;
            /* CRITICAL: Set max width to 1024px */
            max-width: 1024px;
            max-height: 1024px; 
            width: 100%; 
            margin: 0 auto;
            
            aspect-ratio: 1 / 1;
            
            overflow: hidden;
            
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
            background-color: white; 
            
            /* Add transition for smooth zooming */
            transition: transform 0.2s ease-out;
            
            position: relative; 
        }
        
        .drawing-canvas, .line-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%; 
            height: 100%; 
            border-radius: 0.5rem;
            touch-action: none; 
            -webkit-touch-callout: none;
            -webkit-user-select: none;
        }
        
        .line-canvas {
            z-index: 2; 
            pointer-events: none; 
            background: transparent; 
        }
        
        /* MODIFIED: Change cursor based on active tool */
        .drawing-canvas {
            z-index: 1; 
            pointer-events: auto; 
            cursor: ${activeTool === 'brush' ? 'crosshair' : 'grab'};
            background-color: white; 
        }
        .drawing-canvas:active {
            cursor: ${activeTool === 'pan' ? 'grabbing' : 'crosshair'};
        }
        /* --- End Canvas Layering Styles --- */


        .header {
          margin-bottom: 1rem;
          margin-top: 1rem;
          text-align: center;
          margin-left: 0 !important;
          margin-right: 0!important;          
          float: left !important;
          clear: right !important;
          width: 100% !important;
        }
        .header h1 {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 2.5rem;
          font-weight: bold;
          color: #74c14eff;
        }
        .header p {
          font-size: 1.2rem;
          color: #555555;
        }
        .image-selection {
          margin-bottom: 1.5rem;
        }
        select {
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
          font-size: 1rem;
          background-color: #ffffff;
          color: #374151;
        }
        
        .drawing-area-container {
          position: relative;          
          min-height: 700px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .coloring-tools {
          background-color: transparent; 
          padding: 0.5rem;
          border-radius: 1rem;          
          flex: 1;
          max-width: 200px; 
          z-index: 10;
          position: static;
          width: 100%;
          box-shadow: none; 
        }
        @media (min-width: 768px) {
          .coloring-tools {
            position: fixed; 
            width: 80px; 
            max-width: 80px; 
            left: 20px; 
            top: 50%; 
            transform: translateY(-50%); 
            background-color: transparent; 
          }
        }
        
        .toolbox-button-wrapper {
            position: relative; 
            margin: 10px 0;
            width: 60px; 
            height: 60px; 
        }

        .toolbox-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px; 
            height: 60px;
            padding: 0;
            border-radius: 50%; 
            background-color: #ffffff; 
            color: #10533dff; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
            position: relative; 
            z-index: 11;
        }
        .toolbox-button:hover:not(:disabled) {
            transform: scale(1.05);
            background-color: #f3f4f6;
        }
        .toolbox-button.active {
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.5); 
            background-color: #74c14eff; 
            color: #ffffff;
        }
        .toolbox-button.active svg {
            filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
        }

        .brush-controls-panel {
            position: absolute; 
            top: 50%; 
            left: 70px; 
            transform: translateY(-50%); 
            width: 200px; 
            
            background-color: #ffffff;
            border-radius: 0.5rem;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 10;
        }
        .brush-controls-panel::before {
             content: '';
             position: absolute;
             top: 50%;
             left: -10px; 
             transform: translateY(-50%);
             border-top: 10px solid transparent;
             border-bottom: 10px solid transparent;
             border-right: 10px solid #ffffff; 
        }


        .drag-handle {
          user-select: none;
          touch-action: none;
          cursor: default;
        }
        
        @media (min-width: 768px) {
          .drag-handle {
            cursor: grab;
            font-weight: bold;
            color: #10b981;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 1rem;
            display: none; 
          }
        }
        .color-picker-input {
          width: 40px;
          height: 40px;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        
        button {
          cursor: pointer;
          border: none;
          outline: none;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 0.25rem;
          margin: .5rem;
          border-radius: 0.375rem;
          transition: background-color 0.2s;
        }

        .thumbnail-selector-container {
            text-align: center;
        }
        .clear-button {
          background-color: #c41010ff;
        }
        .thumbnail-list {
            display: flex;
            justify-content: center;
            gap: 1.5rem; 
            flex-wrap: wrap; 
            max-width: 100%;
        }
        .thumbnail-item {
            width: 120px; 
            cursor: pointer;
            border: 3px solid transparent;
            border-radius: 0.75rem;
            padding: 0.5rem;
            transition: all 0.2s ease-in-out;
            background-color: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }
        .thumbnail-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        }
        .thumbnail-item.selected {
            border-color: #10b981; 
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.5); 
        }
        .thumbnail-image {
            width: 100%;
            height: 100px; 
            object-fit: cover; 
            border-radius: 0.5rem;
        }
        .thumbnail-label {
            margin-top: 0.5rem;
            font-size: 0.75rem; 
            font-weight: 500;
            color: #374151;
            white-space: nowrap; 
            overflow: hidden;
            text-overflow: ellipsis; 
        }
        
        .zoom-controls-container {
            position: fixed; 
            bottom: 20px;
            right: 20px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: white;
            padding: 0.5rem;
            border-radius: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .zoom-button {
            background-color: #3b82f6; 
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
            color: white;
            font-weight: bold;            
            line-height: 1;
            border-radius: 50%;
            margin: 5px 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .zoom-level-display {
            font-weight: bold;
            color: #374151;
            margin: 5px 0;
            min-width: 50px;
            text-align: center;
        }
        /* --- New CSS for DataList Ticks on Range Input --- */
        .hardness-range-wrapper {
            position: relative;
            padding-bottom: 1.5rem; /* Make space for the datalist ticks */
        }
        
        .hardness-datalist {
            display: flex;
            justify-content: space-between;
            width: 100%;
            position: absolute;
            top: 100%; /* Position ticks below the slider track */
            left: 0;
            padding: 0 5px; /* Adjust padding to align ticks with slider edges */
        }
        
        .hardness-datalist option {
            display: block;
            position: relative;
            width: 1px;
            height: 10px;
            background: #9ca3af; /* Gray line color */
            margin-top: -10px; /* Pull the tick line up into view */
            pointer-events: none; /* Ignore clicks on the ticks */
        }
        
        /* Optional: Add labels below the ticks */
        .hardness-label-list {
            display: flex;
            justify-content: space-between;
            width: 100%;
            position: absolute;
            top: 100%; 
            left: 0;
            font-size: 0.75rem;
            color: #4b5563;
        }
        .hardness-label-list span {
            transform: translateX(-50%); /* Center labels under ticks */
        }
        `}
      </style>
      <div className="mainwrapper">
        <header className="header">
          <h1 className="">Digital Coloring Book</h1>
          <p>
            Select a coloring page and start painting!
          </p>
        </header>


        <button
            onClick={clearCanvas}
            disabled={!selectedImage}
            className="w-full flex items-center justify-center bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-600 transition duration-150 disabled:bg-gray-400 clear-button"
        >
            
            Clear Coloring
        </button>
        <button
            onClick={reloadLineArt}
            disabled={!selectedImage}
            className="w-full flex items-center justify-center bg-purple-500 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-purple-600 transition duration-150 disabled:bg-gray-400"
        >
            Reload Line Art
        </button>
        <p>&nbsp;</p>
        
        {/* Image Selection Section (UNCHANGED) */}
        <div className="image-selection">
            {loadingImages ? (
                <div className="text-gray-500 p-3">Loading image list from static file...</div>
            ) : availableImages.length > 0 ? (
                <ImageThumbnailSelector 
                    availableImages={availableImages} 
                    selectedImage={selectedImage} 
                    setSelectedImage={setSelectedImage} 
                />
            ) : (
                <div className="text-red-500 p-3">
                    Error: Could not load or find images in ${IMAGE_BASE_PATH}
                </div>
            )}
        </div>

        
        {/* Coloring Area and Tools */}
        <div className="drawing-area-container">
            
            {/* Control Panel */}
            <div className="coloring-tools">
                <div className="drag-handle text-center mb-2">🎨 
                  Coloring Tools
                </div>
                
                <div className="space-y-4 flex flex-col items-center">
                    
                    {/* --- ICON BUTTONS --- */}
                    
                    {/* 1. BRUSH BUTTON WRAPPER (FOR SIDE PANEL) */}
                    <div className="toolbox-button-wrapper">
                        {/* BRUSH BUTTON (Toggles Brush Controls) */}
                        <button 
                            onClick={() => handleToolChange('brush')}
                            className={`toolbox-button ${activeTool === 'brush' && showBrushControls ? 'active' : ''}`}
                            aria-label="Select Brush Tool"
                        >
                            <BrushSVG />
                        </button>

                        {/* --- CONDITIONAL BRUSH CONTROLS PANEL --- */}
                        {showBrushControls && activeTool === 'brush' && (
                            <div className="brush-controls-panel">
                                
                                {/* Hardness Slider */}
                                {/* Hardness Slider - MODIFIED HERE */}
                                <div className="mb-4 hardness-range-wrapper">
                                    <label htmlFor="hardness-slider" className="block text-sm font-medium text-gray-700 mb-2">
                                        Hardness ({hardness}%)
                                    </label>
                                    <input
                                        id="hardness-slider"
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="25" // 💡 CRITICAL: Enforce snapping to multiples of 25
                                        list="hardness-ticks" // 💡 CRITICAL: Link to the datalist
                                        value={hardness}
                                        onChange={(e) => setHardness(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                                    />
                                    
                                    {/* 💡 DATA LIST FOR VISUAL TICKS 
                                    <datalist id="hardness-ticks" className="hardness-datalist">
                                        <option value="0"></option>
                                        <option value="25"></option>
                                        <option value="50"></option>
                                        <option value="75"></option>
                                        <option value="100"></option>
                                    </datalist>*/}
                                  </div>
                                {/* Brush Size */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Brush Size ({brushSize}px)
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                                    />
                                </div>
                                
                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                                    <div className="flex items-center justify-center gap-3">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="color-picker-input"
                                            style={{ padding: 0 }}
                                        />
                                        <span className="text-gray-500 text-sm">{color}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* 2. NEW PAN BUTTON */}
                    <div className="toolbox-button-wrapper">
                        <button
                            onClick={() => handleToolChange('pan')}
                            className={`toolbox-button bg-gray-500 text-white ${activeTool === 'pan' ? 'active' : ''}`}
                            aria-label="Select Pan Tool"
                            disabled={zoomLevel <= 0.5}
                        >
                            <PanSVG />
                        </button>
                    </div>

                    {/* 3. UNDO BUTTON (UNCHANGED) */}
                    <div className="toolbox-button-wrapper">
                        <button
                            onClick={undoStroke}
                            disabled={!canUndo}
                            className={`toolbox-button bg-blue-500 text-white ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Undo Last Stroke"
                        >
                            <UndoSVG />
                        </button>
                    </div>

                    {/* 4. DOWNLOAD BUTTON (UNCHANGED) */}
                    <div className="toolbox-button-wrapper">
                        <button
                            onClick={() => {
                              const dCanvas = drawingCanvasRef.current;
                              const lCanvas = lineCanvasRef.current;

                              if (dCanvas && lCanvas) {
                                  const mergedCanvas = document.createElement('canvas');
                                  mergedCanvas.width = dCanvas.width;
                                  mergedCanvas.height = dCanvas.height;
                                  const ctx = mergedCanvas.getContext('2d');

                                  // Draw the colored layer and the line art layer
                                  ctx.drawImage(dCanvas, 0, 0); 
                                  ctx.drawImage(lCanvas, 0, 0); 
                                  
                                  // Convert to Blob (Works better on iPad/Mobile Safari)
                                  mergedCanvas.toBlob((blob) => {
                                      if (!blob) return;
                                      
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `Coloring_Artwork_${Date.now()}.png`;
                                      
                                      // On iPad, the element MUST be in the DOM for the click to trigger
                                      document.body.appendChild(a);
                                      a.click();
                                      
                                      // Clean up to prevent memory leaks
                                      setTimeout(() => {
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                      }, 100);
                                  }, 'image/png');
                              }
                          }}
                            disabled={!selectedImage}
                            className="toolbox-button bg-green-500 text-white"
                            aria-label="Download Artwork"
                        >
                            <DownloadSVG />
                        </button>
                    </div>
                    
                </div>
            </div>

            {/* Canvas Area (FIXED LAYERING) */}
            <div className="lg:w-3/4 bg-white rounded-xl shadow-2xl flex items-center justify-center p-2 order-1 lg:order-2">
                {!selectedImage && (
                     <div className="text-gray-500 p-6 bg-gray-100 rounded-lg w-full text-center h-[400px] sm:h-[600px] flex items-center justify-center">
                        <p className="font-semibold text-lg">No Images Available</p>
                        <p className="text-sm mt-2">Please select an image from the dropdown above, or ensure files are uploaded to {IMAGE_BASE_PATH}</p>
                    </div>
                )}
                
                {/* Two Canvases Stacked */}
                <div 
                    ref={canvasWrapperRef} 
                    className={`canvas-wrapper ${!selectedImage ? 'hidden' : 'block'}`}
                >
                    {/* 1. Drawing Canvas (Bottom Layer, receives mouse events) */}
                    <canvas
                        ref={drawingCanvasRef}
                        className="drawing-canvas"
                    ></canvas>
                    {/* 2. Line Art Canvas (Top Layer, blocks clicks) */}
                    <canvas
                        ref={lineCanvasRef}
                        className="line-canvas"
                    ></canvas>
                </div>
            </div>
        </div>

        {/* Floating Zoom Controls (UNCHANGED) */}
        <div className="zoom-controls-container">
            <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 2.0))} 
                className="zoom-button"
            >
                +
            </button>
            <span className="zoom-level-display">{(zoomLevel * 100).toFixed(0)}%</span>
            <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 1.0))} 
                className="zoom-button"
            >
                -
            </button>
        </div>


         {/* Footer/Debug Info (UNCHANGED) */}
        <div className="mt-8 text-center text-xs text-gray-400">
            <p>&nbsp;</p>
            <p>&nbsp;</p>
            <p>&nbsp;</p>
            <p>&nbsp;</p>
            <p>&nbsp;</p>
            <p>&nbsp;</p>
        </div>
      </div>
    </div>
  );
}
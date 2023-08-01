import React, { useState, useEffect, useRef } from 'react';
import './MiniCropperDefaultStyles.scss';

type Size = {
  width: number;
  height: number;
};

interface MiniCropperProps {
  image: string;
  onCropAreaChange?: (croppedImage: string) => void;
  onSubmit: (croppedImage: string) => void;
  onSubmitBtnText?: string;
  shape?: 'rect' | 'round';
  borderType?: 'dashed' | 'solid';
  borderColor?: string;
  dotColor?: string;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  zoomable?: boolean;
  processing?: boolean;
  cropSize?: Size;
  classes?: {
    containerClassName?: string;
    mediaClassName?: string;
    cropAreaClassName?: string;
    buttonsClassName?: string;
    buttonZoomInClassName?: string;
    buttonZoomOutClassName?: string;
  };
  objectFit?:
    | '-moz-initial'
    | 'inherit'
    | 'initial'
    | 'revert'
    | 'revert-layer'
    | 'unset'
    | 'contain'
    | 'cover'
    | 'fill'
    | 'none'
    | 'scale-down';
}

const MiniCropper: React.FC<MiniCropperProps> = ({
  image,
  onSubmit,
  onCropAreaChange = () => {},
  onSubmitBtnText = 'Save',
  shape = 'rect',
  borderType = 'dashed',
  borderColor = '#873192',
  dotColor = '#fff',
  minZoom = 0.5,
  maxZoom = 2,
  zoomSpeed = 0.1,
  zoomable = true,
  processing = false,
  cropSize = { width: 200, height: 200 },
  classes = {
    containerClassName: 'cropper-container',
    mediaClassName: 'cropper-media',
    cropAreaClassName: 'cropper-drag-handle',
    buttonsClassName: 'cropper-action',
    buttonZoomInClassName: 'cropper-zoom-button cropper-zoom-in',
    buttonZoomOutClassName: 'cropper-zoom-button cropper-zoom-out',
  },
  objectFit = 'contain',
}) => {
  const [cropperData, setCropperData] = useState({
    x: 0,
    y: 0,
    width: cropSize.width,
    height: cropSize.height,
  });
  const [croppedImage, setCroppedImage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Track image loading state
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperContainerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  let handleMouseMove: ((event: MouseEvent) => void) | null = null; // For drag and drop mouse click position control

  const styleOptions = {
    borderRadius: shape === 'rect' ? '0px' : '999px',
    top:
      shape === 'rect'
        ? `calc(${cropperData.y}px + ${cropperData.height}px - 6px)`
        : `calc(${cropperData.y}px + ${cropperData.height}px * 0.85)`,
    left:
      shape === 'rect'
        ? `calc(${cropperData.x}px + ${cropperData.width}px - 6px)`
        : `calc(${cropperData.x}px + ${cropperData.width}px * 0.85)`,
  };

  useEffect(() => {
    const imageElement = imageRef.current;
    const cropperContainerElement = cropperContainerRef.current;
    const dragHandleElement = dragHandleRef.current;

    const calculateInitialCropperData = () => {
      if (imageElement && cropperContainerElement && dragHandleElement) {
        const containerWidth = cropperContainerElement.offsetWidth;
        const containerHeight = cropperContainerElement.offsetHeight;

        const imageAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        let width = containerWidth;
        let height = containerHeight;
        let x = 0;
        let y = 0;

        if (imageAspectRatio > containerAspectRatio) {
          height = containerWidth / imageAspectRatio;
          y = (containerHeight - height) / 2;
        } else {
          width = containerHeight * imageAspectRatio;
          x = (containerWidth - width) / 2;
        }

        setCropperData({ x, y, width, height });

        // Adjust drag handle size
        const handleSize = Math.min(width, height) / 6;
        dragHandleElement.style.width = `${handleSize}px`;
        dragHandleElement.style.height = `${handleSize}px`;
      }
    };

    calculateInitialCropperData();
    window.addEventListener('resize', calculateInitialCropperData);

    return () => {
      window.removeEventListener('resize', calculateInitialCropperData);
    };
  }, []);

  const calculateImageQuality = (width: number, height: number): number => {
    const maxDimension = Math.max(width, height);
    let quality = 1;

    if (maxDimension > 1000) {
      const scaleFactor = maxDimension / (maxDimension / 1.2);
      quality = 1 / scaleFactor;
    }

    return quality;
  };

  useEffect(() => {
    const imageElement = imageRef.current;

    if (imageElement) {
      const quality = calculateImageQuality(imageElement.width, imageElement.height);

      imageElement.onload = function () {
        if (quality === 1) {
          renderImage(imageElement, 1).then((r) => setIsLoading(false));
        } else {
          renderImage(imageElement, quality).then((r) => setIsLoading(false));
        }
      };

      const renderImage = (sourceImage: HTMLImageElement, quality: number): Promise<Blob> =>
        new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true, desynchronized: true });

          if (ctx) {
            const scale = sourceImage.naturalWidth / (sourceImage.width * zoomLevel);
            const { x, y, width, height } = cropperData;
            canvas.width = width * scale;
            canvas.height = height * scale;

            ctx.drawImage(
              imageElement,
              x * scale,
              y * scale,
              width * scale,
              height * scale,
              0,
              0,
              width * scale,
              height * scale,
            );
          }

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          onCropAreaChange(dataUrl);
          setCroppedImage(dataUrl);
        });

      if (quality === 1) {
        renderImage(imageElement, 1).then((r) => setIsLoading(false));
      } else {
        renderImage(imageElement, quality).then((r) => setIsLoading(false));
      }
    }

    setTimeout(() => setIsLoading(false), 500);
  }, [cropperData, zoomLevel]);

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (processing) return;

    event.preventDefault();
    const initialMouseX = event.clientX;
    const initialMouseY = event.clientY;
    const initialCropperX = cropperData.x;
    const initialCropperY = cropperData.y;

    handleMouseMove = (event: MouseEvent) =>
      handleDragMove(event, initialMouseX, initialMouseY, initialCropperX, initialCropperY);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (
    event: MouseEvent,
    initialMouseX: number,
    initialMouseY: number,
    initialCropperX: number,
    initialCropperY: number,
  ) => {
    event.preventDefault();

    const imageElement = imageRef.current;
    const cropperContainerElement = cropperContainerRef.current;

    if (imageElement && cropperContainerElement) {
      const { width, height } = cropperData;
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const maxX = cropperContainerElement.offsetWidth - width;
      const maxY = cropperContainerElement.offsetHeight - height;

      const clampedX = Math.max(0, Math.min(maxX, initialCropperX + mouseX - initialMouseX));
      const clampedY = Math.max(0, Math.min(maxY, initialCropperY + mouseY - initialMouseY));

      setCropperData((prevData) => ({
        ...prevData,
        x: clampedX,
        y: clampedY,
      }));
    }
  };

  const handleDragEnd = () => {
    if (handleMouseMove) {
      document.removeEventListener('mousemove', handleMouseMove);
      handleMouseMove = null;
    }
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (processing) return;

    event.preventDefault();
    event.stopPropagation();
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (event: MouseEvent) => {
    event.preventDefault();

    const imageElement = imageRef.current;
    const cropperContainerElement = cropperContainerRef.current;

    if (imageElement && cropperContainerElement) {
      const containerRect = cropperContainerElement.getBoundingClientRect();

      const newWidth = event.clientX - containerRect.left - cropperData.x;
      const newHeight = event.clientY - containerRect.top - cropperData.y;

      const { x, y } = cropperData;

      const clampedWidth = Math.max(0, Math.min(newWidth, containerRect.width - x));
      const clampedHeight = Math.max(0, Math.min(newHeight, containerRect.height - y));

      setCropperData((prevData) => ({
        ...prevData,
        width: clampedWidth,
        height: clampedHeight,
      }));
    }
  };

  const handleResizeEnd = () => {
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleZoomIn = () => {
    setZoomLevel((prevZoomLevel) => Math.min(prevZoomLevel + zoomSpeed, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoomLevel) => Math.max(prevZoomLevel - zoomSpeed, minZoom));
  };

  const handleSave = () => {
    onSubmit(croppedImage);
  };

  return (
    <div className={classes.containerClassName || 'cropper-container'} ref={cropperContainerRef}>
      <div
        className='cropper-image'
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          width: '100%',
        }}
      >
        {isLoading ? (
          <div
            className='cropper-skeleton-animation'
            style={{
              minWidth: '100%',
              minHeight: '400px',
              borderRadius: '8px',
            }}
          />
        ) : null}
        <img
          src={image}
          alt='Crop'
          ref={imageRef}
          className={classes.mediaClassName || 'cropper-media'}
          style={{
            display: isLoading ? 'none' : 'block',
            maxWidth: '100%',
            maxHeight: '100%',
            top: 0,
            left: 0,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            backfaceVisibility: 'hidden',
            objectFit: `${objectFit}`,
          }}
        />
        {isLoading ? null : (
          <>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className={classes.cropAreaClassName || 'cropper-drag-handle'}
              style={{
                position: 'absolute',
                top: `${cropperData.y}px`,
                left: `${cropperData.x}px`,
                width: `${cropperData.width}px`,
                height: `${cropperData.height}px`,
                maxWidth: '100%',
                maxHeight: '100%',
                border: `1px ${borderType} ${borderColor}`,
                pointerEvents: 'initial',
                cursor: 'move',
                zIndex: 2,
                borderRadius: `${styleOptions.borderRadius}`,
                boxShadow: '0 0 0 1600px rgba(0,0,0,0.65)' /* dark around it */,
              }}
              onMouseDown={handleDragStart}
            />
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className='cropper-resize-handle'
              style={{
                position: 'absolute',
                top: `${styleOptions.top}`,
                left: `${styleOptions.left}`,
                width: '12px',
                height: '12px',
                cursor: 'nwse-resize',
                backgroundColor: `${dotColor}`,
                border: '1px solid #000',
                borderRadius: `${styleOptions.borderRadius}`,
                zIndex: 2,
              }}
              onMouseDown={handleResizeStart}
            />
          </>
        )}
        {zoomable && (
          <div className='cropper-zoom-buttons'>
            <button
              disabled={processing}
              className={classes.buttonZoomInClassName || 'cropper-zoom-button cropper-zoom-in'}
              onClick={handleZoomIn}
            >
              +
            </button>
            <button
              disabled={processing}
              className={classes.buttonZoomOutClassName || 'cropper-zoom-button cropper-zoom-out'}
              onClick={handleZoomOut}
            >
              -
            </button>
          </div>
        )}
      </div>
      <div className='cropper-actions'>
        <button
          className={classes.buttonsClassName || 'cropper-action'}
          onClick={handleSave}
          disabled={processing}
        >
          {processing ? 'Processing...' : onSubmitBtnText}
        </button>
      </div>
    </div>
  );
};

export default MiniCropper;

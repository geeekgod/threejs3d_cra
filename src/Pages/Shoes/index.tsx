import { useEffect, useRef, useState } from 'react';
import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from '@mediapipe/drawing_utils';
import './index.scss';
import { BOX_CONNECTIONS, BOX_KEYPOINTS, Objectron, VERSION } from '@mediapipe/objectron';

function drawAxes(
  canvasCtx: CanvasRenderingContext2D, landmarks: any, color: any) {
  const {
    BACK_BOTTOM_RIGHT,
    BACK_TOP_LEFT,
    BACK_TOP_RIGHT,
    FRONT_BOTTOM_LEFT,
    FRONT_BOTTOM_RIGHT,
    FRONT_TOP_RIGHT,
    FRONT_TOP_LEFT,
    CENTER
  } = BOX_KEYPOINTS;

  const xMidPoint = lineIntersection(
    [landmarks[BACK_BOTTOM_RIGHT], landmarks[FRONT_TOP_RIGHT]],
    [landmarks[BACK_TOP_RIGHT], landmarks[FRONT_BOTTOM_RIGHT]]);
  const yMidPoint = lineIntersection(
    [landmarks[BACK_TOP_LEFT], landmarks[FRONT_TOP_RIGHT]],
    [landmarks[FRONT_TOP_LEFT], landmarks[BACK_TOP_RIGHT]]);
  const zMidPoint = lineIntersection(
    [landmarks[FRONT_TOP_RIGHT], landmarks[FRONT_BOTTOM_LEFT]],
    [landmarks[FRONT_TOP_LEFT], landmarks[FRONT_BOTTOM_RIGHT]]);

  const LINE_WIDTH = 8;
  const TRIANGLE_BASE = 2 * LINE_WIDTH;

  drawConnectors(
    canvasCtx, [landmarks[CENTER], xMidPoint], [[0, 1]],
    { color: color.x, lineWidth: LINE_WIDTH });
  drawConnectors(
    canvasCtx, [landmarks[CENTER], yMidPoint], [[0, 1]],
    { color: color.y, lineWidth: LINE_WIDTH });
  drawConnectors(
    canvasCtx, [landmarks[CENTER], zMidPoint], [[0, 1]],
    { color: color.z, lineWidth: LINE_WIDTH });

  drawTriangle(
    canvasCtx, xMidPoint, TRIANGLE_BASE, TRIANGLE_BASE, color.x,
    arctan360(
      xMidPoint.x - landmarks[CENTER].x,
      xMidPoint.y - landmarks[CENTER].y) +
    Math.PI / 2);
  drawTriangle(
    canvasCtx, yMidPoint, TRIANGLE_BASE, TRIANGLE_BASE, color.y,
    arctan360(
      yMidPoint.x - landmarks[CENTER].x,
      yMidPoint.y - landmarks[CENTER].y) +
    Math.PI / 2);
  drawTriangle(
    canvasCtx, zMidPoint, TRIANGLE_BASE, TRIANGLE_BASE, color.z,
    arctan360(
      zMidPoint.x - landmarks[CENTER].x,
      zMidPoint.y - landmarks[CENTER].y) +
    Math.PI / 2);
}

function lineIntersection(
  a: any, b: any) {
  const yDiffB = b[0].y - b[1].y;
  const xDiffB = b[0].x - b[1].x;

  const top = (a[0].x - b[0].x) * yDiffB - (a[0].y - b[0].y) * xDiffB;
  const bot = (a[0].x - a[1].x) * yDiffB - (a[0].y - a[1].y) * xDiffB;
  const t = top / bot;

  return {
    x: a[0].x + t * (a[1].x - a[0].x),
    y: a[0].y + t * (a[1].y - a[0].y),
    depth: 0,
  };
}

function drawTriangle(
  ctx: CanvasRenderingContext2D, point: any, height: any,
  baseber: any, color: any, rotation = 0) {
  const canvas = ctx.canvas;
  const realX = canvas.width * point.x;
  const realY = canvas.height * point.y;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.translate(realX, realY);
  ctx.rotate(rotation);
  ctx.moveTo(baseber / 2, 0);
  ctx.lineTo(0, -height);
  ctx.lineTo(-baseber / 2, 0);
  ctx.lineTo(baseber / 2, 0);
  ctx.translate(-realX, -realY);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function arctan360(x: any, y: any) {
  if (x === 0) {
    return y >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  const angle = Math.atan(y / x);

  if (x > 0) {
    return angle;
  }

  return y >= 0 ? (angle + Math.PI) : angle - Math.PI;
}


const ShoesContainer = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log('rendering');
      contextRef.current = canvasRef.current.getContext('2d');
      const constraints = {
        video: { width: { min: 1280 }, height: { min: 720 } },
      };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (inputVideoRef.current) {
          inputVideoRef.current.srcObject = stream;
        }
        sendToMediaPipe();
      });

      const objectron = new Objectron({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/objectron@${VERSION}/${file}`
        }
      });

      objectron.setOptions({
        selfieMode: false,
        modelName: 'Shoe',
        maxNumObjects: 2,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.99,
      });

      objectron.onResults(onResults);

      const sendToMediaPipe = async () => {
        if (inputVideoRef.current) {
          if (!inputVideoRef.current.videoWidth) {
            requestAnimationFrame(sendToMediaPipe);
          } else {
            await objectron.send({ image: inputVideoRef.current });
            requestAnimationFrame(sendToMediaPipe);
          }
        }
      };
    }
  }, [inputVideoReady]);

  const onResults = (results: any) => {
    // console.log(results)
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      contextRef.current.save();
      contextRef.current.drawImage(
        results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
      if (!!results.objectDetections) {
        for (const detectedObject of results.objectDetections) {
          // Reformat keypoint information as landmarks, for easy drawing.
          const landmarks =
            detectedObject.keypoints.map((x: any) => x.point2d);
          // Draw bounding box.
          drawConnectors(contextRef.current, landmarks,
            BOX_CONNECTIONS, { color: '#FF0000' });

          // Draw Axes
          drawAxes(contextRef.current, landmarks, {
            x: '#00FF00',
            y: '#FF0000',
            z: '#0000FF',
          });
          // Draw centroid.
          drawLandmarks(contextRef.current, [landmarks[0]], { color: '#FFFFFF' });
        }
      }
      contextRef.current.restore();
    }
  };

  return (
    <div className="shoes-container">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
      />
      <canvas ref={canvasRef} width={1280} height={720} />
      {!loaded && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default ShoesContainer;

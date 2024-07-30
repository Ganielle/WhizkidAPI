const fs = require('fs');
const Pitchfinder = require('pitchfinder');
const wav = require('node-wav');

exports.computeAccuracy = (transcription, reference) => {
    const wer = computeWER(reference, transcription);
    const accuracy = 100 - wer;
    return Math.max(0, Math.min(100, accuracy));
}

exports.analyzeProsody = (audioFilePath, referenceStory) => {
  const buffer = fs.readFileSync(audioFilePath);
  const result = wav.decode(buffer);

  console.log('Audio data length:', result.channelData[0].length);
  console.log('Sample rate:', result.sampleRate);

  // Initialize pitch detection
  const detectPitch = Pitchfinder.YIN();
  const audioData = result.channelData[0];
  const pitchValues = [];
  
  // Process audio data in chunks
  const chunkSize = 2048; // Adjust chunk size if necessary
  for (let i = 0; i < audioData.length; i += chunkSize) {
    const chunk = audioData.slice(i, i + chunkSize);
    const pitch = detectPitch(chunk);
    if (pitch && pitch > 0) {
      pitchValues.push(pitch);
    }
  }

  // Calculate average pitch
  const averagePitch = pitchValues.length > 0 
    ? pitchValues.reduce((sum, pitch) => sum + pitch, 0) / pitchValues.length 
    : 0;

  console.log('Detected pitches:', pitchValues);
  console.log('Average pitch:', averagePitch);

  const intensity = calculateIntensity(result.channelData[0]);
  const { tempo, detectedWordCount } = calculateTempo(result.channelData[0], result.sampleRate);

  // Define ranges for percentage conversion
  const pitchRange = { min: 85, max: 255 }; // Hz
  const intensityRange = { min: 0, max: 1 }; // RMS
  const tempoRange = { min: 60, max: 180 }; // bpm

  const averagePitchPercentage = convertToPercentage(averagePitch, pitchRange.min, pitchRange.max);
  const intensityPercentage = convertToPercentage(intensity, intensityRange.min, intensityRange.max);

  // Calculate tempo percentage
  const referenceWordCount = calculateWordCount(referenceStory);
  const expectedBPMFastest = calculateBPMFastest(referenceStory);
  const tempoPercentage = convertToPercentage((detectedWordCount / referenceWordCount) * tempo, tempoRange.min, expectedBPMFastest);

  console.log(`averagePitchPercentage: ${averagePitchPercentage}  intensityPercentage: ${intensityPercentage}  tempoPercentage: ${tempoPercentage}`);

  return {averagePitchPercentage, intensityPercentage, tempoPercentage};
}

exports.analyzeSpeed = (referenceStory, words) => {
  const referenceWordCount = calculateWordCount(referenceStory);

  // Calculate the user's reading speed in words per minute
  const userWordCount = words.length;
  const userReadingSpeed = (userWordCount / durationInSeconds) * 60; // WPM

  // Calculate the reference speed (average reading speed)
  const referenceReadingSpeed = calculateReferenceSpeed(referenceWordCount, durationInSeconds);

  // Calculate the percentage of the user's speed relative to the reference
  const speedPercentage = convertToPercentage(userReadingSpeed, referenceReadingSpeed * 0.5, referenceReadingSpeed * 2);

  console.log(`User's Reading Speed: ${userReadingSpeed} WPM`);
  console.log(`Reference Reading Speed: ${referenceReadingSpeed} WPM`);
  console.log(`Speed Percentage: ${speedPercentage}%`);

  return speedPercentage;
}

function calculateReferenceSpeed(wordCount, durationInSeconds) {
  // Assuming an average reading speed of 200 WPM for a full story duration
  const averageReadingSpeed = 200; // WPM
  const referenceDuration = wordCount / (averageReadingSpeed / 60); // seconds
  return referenceDuration / durationInSeconds; // speed factor
}

function calculateIntensity(audioData) {
  const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample ** 2, 0) / audioData.length);
  return rms;
}

function calculateTempo(audioData, sampleRate) {
  const fftSize = 1024;
  const hopSize = fftSize / 2;
  const onsetThreshold = 0.3;
  const FFT = require('fft.js');
  const fft = new FFT(fftSize);
  const windowFunction = (i, N) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));

  let onsets = [];
  let previousSpectrum = null;

  for (let i = 0; i < audioData.length - fftSize; i += hopSize) {
    const windowedSignal = new Float32Array(fftSize);
    for (let j = 0; j < fftSize; j++) {
      windowedSignal[j] = audioData[i + j] * windowFunction(j, fftSize);
    }

    const spectrum = fft.createComplexArray();
    fft.realTransform(spectrum, windowedSignal);
    fft.completeSpectrum(spectrum);

    if (previousSpectrum) {
      const onset = spectralFlux(spectrum, previousSpectrum);
      if (onset > onsetThreshold) {
        onsets.push(i / sampleRate);
      }
    }

    previousSpectrum = spectrum;
  }

  const interOnsetIntervals = [];
  for (let i = 1; i < onsets.length; i++) {
    interOnsetIntervals.push(onsets[i] - onsets[i - 1]);
  }

  const averageInterOnsetInterval = interOnsetIntervals.reduce((sum, interval) => sum + interval, 0) / interOnsetIntervals.length;
  const bpm = 60 / averageInterOnsetInterval;

  // Approximate word count based on detected onsets
  const detectedWordCount = Math.round(onsets.length / 2);

  return { tempo: bpm, detectedWordCount };
}

function spectralFlux(currentSpectrum, previousSpectrum) {
  let flux = 0;
  for (let i = 0; i < currentSpectrum.length / 2; i++) {
    const magnitudeDifference = Math.abs(currentSpectrum[i] - previousSpectrum[i]);
    flux += magnitudeDifference;
  }
  return flux;
}

function convertToPercentage(value, min, max) {
  if (value < min) return 0;
  if (value > max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function calculateBPM(wordCount, durationInSeconds) {
  return (wordCount / durationInSeconds) * 60;
}

function calculateWordCount(story) {
  return story.split(/\s+/).filter(word => word.length > 0).length;
}

function calculateBPMFastest(story){
  const wordCount = calculateWordCount(story);
  const durationInSeconds = 80;
  const wordsPerMinute = (wordCount / durationInSeconds) * 60;
  const beatsPerMinute = wordsPerMinute;

  console.log('Word Count:', wordCount);
  console.log('Words Per Minute (WPM):', wordsPerMinute);
  console.log('Beats Per Minute (BPM):', beatsPerMinute);

  return beatsPerMinute;
}
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function computeWER(reference, hypothesis) {
  const refWords = reference.split(' ');
  const hypWords = hypothesis.split(' ');
  const distance = levenshteinDistance(refWords, hypWords);
  return (distance / refWords.length) * 100;
}

exports.getWavDuration = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const result = wav.decode(buffer);
  const sampleRate = result.sampleRate;
  const length = result.channelData[0].length; // Assuming mono or using the first channel
  const duration = length / sampleRate;
  return duration;
}
exports.computeAccuracy = (transcription, reference) => {
    const wer = computeWER(reference, transcription);
    const accuracy = 100 - wer;
    return Math.max(0, Math.min(100, accuracy));
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
export const codingChallenges = [
  { title: 'Even Checker', prompt: 'Write a function isEven(n) that returns true if n is even, false otherwise.', fnName: 'isEven', starter: 'function isEven(n) {\n  // your code here\n}', tests: [{ args: [4], expected: true }, { args: [7], expected: false }, { args: [0], expected: true }, { args: [-3], expected: false }] },
  { title: 'Sum It Up', prompt: 'Write sumArray(arr) that returns the sum of all numbers in the array.', fnName: 'sumArray', starter: 'function sumArray(arr) {\n  // your code here\n}', tests: [{ args: [[1, 2, 3]], expected: 6 }, { args: [[]], expected: 0 }, { args: [[5, -2, 10]], expected: 13 }] },
  { title: 'Mirror Mirror', prompt: 'Write reverseStr(str) that returns the string reversed.', fnName: 'reverseStr', starter: 'function reverseStr(str) {\n  // your code here\n}', tests: [{ args: ['hello'], expected: 'olleh' }, { args: [''], expected: '' }, { args: ['a'], expected: 'a' }] },
  { title: 'Peak Finder', prompt: 'Write findMax(arr) that returns the largest number in the array.', fnName: 'findMax', starter: 'function findMax(arr) {\n  // your code here\n}', tests: [{ args: [[1, 5, 2]], expected: 5 }, { args: [[-1, -5, -2]], expected: -1 }, { args: [[7]], expected: 7 }] },
  { title: 'Vowel Counter', prompt: 'Write countVowels(str) that returns the number of vowels (a,e,i,o,u — case-insensitive).', fnName: 'countVowels', starter: 'function countVowels(str) {\n  // your code here\n}', tests: [{ args: ['Hello World'], expected: 3 }, { args: ['xyz'], expected: 0 }, { args: ['AEIOUaeiou'], expected: 10 }] },
  { title: 'Palindrome Patrol', prompt: 'Write isPalindrome(str) that returns true if the string reads the same forwards and backwards.', fnName: 'isPalindrome', starter: 'function isPalindrome(str) {\n  // your code here\n}', tests: [{ args: ['racecar'], expected: true }, { args: ['hello'], expected: false }, { args: [''], expected: true }] },
];

export const triviaQuestions = [
  { q: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unifier'], answer: 0 },
  { q: 'Which data structure follows LIFO (Last In, First Out) order?', options: ['Queue', 'Stack', 'Linked List', 'Tree'], answer: 1 },
  { q: 'What is the time complexity of binary search on a sorted array?', options: ['O(n)', 'O(n^2)', 'O(log n)', 'O(1)'], answer: 2 },
  { q: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High-Tech Modern Language', 'HyperText Modern Layout', 'Hyper Transfer Markup Language'], answer: 0 },
  { q: 'Who is credited with creating the Linux kernel?', options: ['Bill Gates', 'Linus Torvalds', 'Dennis Ritchie', 'Guido van Rossum'], answer: 1 },
  { q: 'What does RAM stand for?', options: ['Read Access Memory', 'Random Access Memory', 'Rapid Allocation Method', 'Run All Memory'], answer: 1 },
  { q: 'Which sorting algorithm has O(n^2) worst-case time complexity?', options: ['Merge Sort', 'Quick Sort (average case)', 'Bubble Sort', 'Binary Search'], answer: 2 },
  { q: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Logic', 'System Query Language', 'Sequential Query Language'], answer: 0 },
  { q: 'Who created the Git version control system?', options: ['Guido van Rossum', 'Linus Torvalds', 'James Gosling', 'Brendan Eich'], answer: 1 },
  { q: 'What is the time complexity of accessing an array element by index?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], answer: 2 },
];

export const bigOQuestions = [
  { snippet: 'for (let i = 0; i < n; i++) {\n  doWork(i);\n}', answer: 'O(n)' },
  { snippet: 'for (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) {\n    doWork(i, j);\n  }\n}', answer: 'O(n^2)' },
  { snippet: 'return arr[5];', answer: 'O(1)' },
  { snippet: 'let i = n;\nwhile (i > 1) {\n  i = i / 2;\n}', answer: 'O(log n)' },
  { snippet: 'for (let i = 0; i < n; i++) { doWork(i); }\nfor (let j = 0; j < n; j++) { doMore(j); }', answer: 'O(n)' },
  { snippet: 'for (let i=0;i<n;i++)\n  for (let j=0;j<n;j++)\n    for (let k=0;k<n;k++)\n      doWork(i,j,k);', answer: 'O(n^3)' },
  { snippet: 'function search(arr, target) {\n  for (let i=0;i<arr.length;i++){\n    if (arr[i]===target) return i;\n  }\n  return -1;\n}', answer: 'O(n)' },
  { snippet: 'function binarySearch(arr, t, lo=0, hi=arr.length-1) {\n  if (lo > hi) return -1;\n  const mid = Math.floor((lo+hi)/2);\n  if (arr[mid]===t) return mid;\n  return arr[mid] < t\n    ? binarySearch(arr, t, mid+1, hi)\n    : binarySearch(arr, t, lo, mid-1);\n}', answer: 'O(log n)' },
];
export const bigOOptions = ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)', 'O(n^3)'];

export const debugSnippets = [
  { lines: ['function containsAll(arr, n) {', '  for (let i = 0; i < arr.length - 1; i++) {', '    if (arr[i] === n) return true;', '  }', '  return false;', '}'], buggy: 1, why: 'The loop stops one element early — it should run while i < arr.length.' },
  { lines: ['function isPositive(n) {', '  if (n = 0) {', '    return false;', '  }', '  return n > 0;', '}'], buggy: 1, why: 'This uses = (assignment) instead of === (comparison), so it always sets n to 0.' },
  { lines: ['function countdown(n) {', '  let i = n;', '  while (i > 0) {', '    console.log(i);', '    n--;', '  }', '  return "done";', '}'], buggy: 4, why: 'The loop checks i but decrements n instead — i never changes, so this loops forever.' },
  { lines: ['function multiplyAll(nums) {', '  let result = 0;', '  for (const n of nums) {', '    result *= n;', '  }', '  return result;', '}'], buggy: 1, why: 'Starting the product at 0 makes the result always 0 — it should start at 1.' },
  { lines: ['function removeNegatives(nums) {', '  for (let i = 0; i < nums.length; i++) {', '    if (nums[i] < 0) {', '      nums.splice(i, 1);', '    }', '  }', '  return nums;', '}'], buggy: 3, why: 'Splicing while iterating forward skips the element that shifts into the current index.' },
  { lines: ['function average(nums) {', '  let sum = 0;', '  for (const n of nums) sum += n;', '  return sum / nums.length + 1;', '}'], buggy: 3, why: 'The + 1 is applied after dividing, throwing off the average.' },
];

export const memoryPairs = [
  { icon: '📚', label: 'Stack' },
  { icon: '🚶', label: 'Queue' },
  { icon: '🌳', label: 'Tree' },
  { icon: '🕸️', label: 'Graph' },
  { icon: '🔑', label: 'Hash Map' },
  { icon: '📦', label: 'Array' },
];

export const typeSnippets = [
  'const sum = (a, b) => a + b;',
  'for (let i = 0; i < 10; i++) console.log(i);',
  'function isEven(n) { return n % 2 === 0; }',
  'const arr = [1, 2, 3].map(x => x * 2);',
  'if (user && user.isActive) grantAccess();',
];

export const regexBank = [
  { re: /^\d+$/, display: '/^\\d+$/', test: '42', isMatch: true },
  { re: /^\d+$/, display: '/^\\d+$/', test: '42a', isMatch: false },
  { re: /^[a-z]+$/i, display: '/^[a-z]+$/i', test: 'Hello', isMatch: true },
  { re: /^[a-z]+$/i, display: '/^[a-z]+$/i', test: 'Hello!', isMatch: false },
  { re: /^\w+@\w+\.\w+$/, display: '/^\\w+@\\w+\\.\\w+$/', test: 'a@b.com', isMatch: true },
  { re: /^\w+@\w+\.\w+$/, display: '/^\\w+@\\w+\\.\\w+$/', test: 'not-an-email', isMatch: false },
  { re: /^(ab)+$/, display: '/^(ab)+$/', test: 'ababab', isMatch: true },
  { re: /^(ab)+$/, display: '/^(ab)+$/', test: 'abab a', isMatch: false },
  { re: /^[A-Z][a-z]*$/, display: '/^[A-Z][a-z]*$/', test: 'Code', isMatch: true },
  { re: /^[A-Z][a-z]*$/, display: '/^[A-Z][a-z]*$/', test: 'code', isMatch: false },
];

export const streakBadges = [
  { days: 3, label: '🔥 3-Day Spark' },
  { days: 7, label: '⚡ Week Streak' },
  { days: 14, label: '🚀 Two-Week Grinder' },
  { days: 30, label: '🏆 Monthly Legend' },
];
export const pointBadges = [
  { pts: 100, label: '⭐ 100 Club' },
  { pts: 500, label: '🌟 500 Club' },
  { pts: 1000, label: '💎 1K Legend' },
  { pts: 2500, label: '👑 Hall of Famer' },
];
export const ALL_BADGE_DEFS = [
  ...streakBadges.map((b) => b.label),
  ...pointBadges.map((b) => b.label),
  '🎯 Perfect Score', '⚡ Speed Demon', '🐛 Bug Squasher', '🧠 Memory Master',
  '⌨️ Fast Fingers', '✅ Regex Master', '🎮 All-Rounder',
];

export const LEVEL_STEP = 150;
export const levelOf = (points) => Math.floor((points || 0) / LEVEL_STEP) + 1;
export const xpPctOf = (points) => (((points || 0) % LEVEL_STEP) / LEVEL_STEP) * 100;

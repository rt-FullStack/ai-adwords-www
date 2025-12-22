// makes all the first letters of each word capitalized
function capitalizeEachWord(inputText) {
  return inputText
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
export default capitalizeEachWord;

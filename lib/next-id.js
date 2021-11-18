let currId = 0;

function nextId() {
  currId += 1;
  return currId;
}

module.exports = nextId;

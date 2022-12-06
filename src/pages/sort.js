function swap(data, a, b, stat) {
  const tmp = data[a];
  data[a] = data[b];
  data[b] = tmp;
  stat.copy += 3;
}

function gt(lhs, rhs, stat) {
  ++stat.comp;
  return lhs > rhs;
}

function toPercent(min, max, value) {
  return (value - min) / (max - min);
}

function fromPercent(min, max, percent) {
  return percent * (max - min) + min;
}

function showStat(stat) {
  document.getElementById("result-comparison").innerText = stat.comp;
  document.getElementById("result-copy").innerText = stat.copy;
  document.getElementById("result-step").innerText = stat.step;
}

function generateData() {
  const type = document.getElementById("data-type").value;
  const len = document.getElementById("num-data").value;
  let arr = [];
  if(type === "random") {
    for(let i=0; i<len; ++i) {
      arr.push(Math.random());
    }
  }
  return arr;
}

function dataDrawer(canvas_, gradationFunc){
  let row = 0;
  const gradation = gradationFunc;
  const canvas = canvas_;
  const rowHeight = 4;
  function f(arr, markers) {
    const width = canvas.width / arr.length;
    let ctx = canvas.getContext('2d');
    if(canvas.height < (row+1)*rowHeight) {
      if(canvas.height*2 > 16000) {
        stopExecution = true;
        return;
      }
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.height *= 2;
      ctx.putImageData(img, 0, 0);
    }

    for(let i = 0; i < arr.length; ++i) {
      const color = gradation(arr[i]);
      ctx.fillStyle = color;
      ctx.fillRect(i*width, row*rowHeight, width, rowHeight);
    }
    
    for(let i=0; i<markers.length; ++i) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(markers[i]*width + width/2, (row+1)*rowHeight+1);
      ctx.lineTo(markers[i]*width + width/2 - 2, (row+1)*rowHeight+1+4);
      ctx.lineTo(markers[i]*width + width/2 + 2, (row+1)*rowHeight+1+4);
      ctx.fill();
    }

    ++row;
  }
  return f;
}

function getGradation(min, max) {
  const type = document.getElementById("gradation-type").value;
  if(type === "gray") {
    return gradationGrayscale(min, max);
  }
  else if(type == "hsl") {
    return gradationHsl(min, max);
  }
  else {
    return gradationColormapLib(type)(min, max);
  }
}

function gradationGrayscale(min_, max_) {
  const min = min_;
  const max = max_;

  function f(value) {
    const p = toPercent(min, max, value);
    const c = fromPercent(0, 255, 1.0-p);
    return 'rgb('+c+','+c+','+c+')';
  }
  return f;
}

function gradationHsl(min_, max_) {
  const min = min_;
  const max = max_;

  function f(value) {
    const p = toPercent(min, max, value);
    const h = fromPercent(0, 240, 1.0-p);
    return 'hsl(' + h + ', 100%, 50%)';
  }
  return f;
}

function gradationColormapLib(name_) {
  const name = name_;
  function g(min_, max_) {
    const min = min_;
    const max = max_;
    const colors = window.Colormap({
      colormap: name,
      nshades: document.getElementById("num-data").value,
      format: 'hex',
      alpha: 1
    })

    function f(value) {
      const p = toPercent(min, max, value);
      const color = colors[Math.floor(fromPercent(0, colors.length-1, p))];
      return color;
    }
    return f;
  }
  return g;
}

function getSorter() {
  const algo = document.getElementById("algo-type").value;
  if(algo === 'bubble') {
    return bubbleSort;
  }
  else if(algo === 'simple') {
    return simpleSort;
  }
  else if(algo === 'selection') {
    return selectionSort;
  }
  else if(algo === 'insertion') {
    return insertionSort;
  }
}

function* bubbleSort(data, stat) {
  const len = data.length;
  for(let i = 0; i < len-1; ++i) {
    for(let j = len-1; i+1 < j; --j) {
      if (gt(data[j-1], data[j], stat)) {
        swap(data, j-1, j, stat);
      }
      ++stat.step;
      yield {arr: data, markers: [i, j]};
    }
  }
}

function* simpleSort(data, stat) {
  const len = data.length;
  for(let i = 0; i < len-1; ++i) {
    for(let j = i+1; j < len; ++j) {
      if(gt(data[i], data[j], stat)) {
        swap(data, i, j, stat);
      }
      ++stat.step;
      yield {arr: data, markers: [i, j]};
    }
  }
}

function* selectionSort(data, stat) {
  const len = data.length;
  let minpos = 0;
  for(let i = 0; i < len-1; ++i) {
    for(let j = i+1; j < len; ++j) {
      if(gt(data[minpos], data[j], stat)) {
        minpos = j;
      }
      ++stat.step;
      yield {arr: data, markers: [i, j]};
    }
    swap(data, i, minpos, stat);
  }
}

function* insertionSort(data, stat) {
  const len = data.length;
  let minpos = 0;
  let w;
  for(let i = 1; i < len; ++i) {
    w = data[i];
    let j = i - 1;
    while(gt(data[j], w, stat) && j >= 0) {
      data[j+1] = data[j];
      --j;
      ++stat.copy;
      ++stat.step;
      yield {arr: data, markers: [i, j]};
    }
    data[j+1] = w;
    ++stat.copy;
  }
}

let stopExecution = false;

const executeStepByStep = async function() {
  const canvas = document.getElementById("output");
  const width = document.querySelector(".sort-main").clientWidth;
  canvas.width = Math.min(width - 20, 4 * document.getElementById("num-data").value);
  console.log("set #output width", width);
  stopExecution = false;
  document.getElementById("exec-step-by-step").setAttribute("disabled", true);

  const wait = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let stat = {copy: 0, comp: 0, step: 0};
  let data = generateData();
  let draw = dataDrawer(canvas, getGradation(
    Math.min(...data),
    Math.max(...data)));
  let iter = getSorter()(data, stat);
  let v;
  draw(data, []);
  while(!(v = iter.next()).done) {
    draw(v.value.arr, v.value.markers);
    showStat(stat);
    const interval = document.getElementById("step-interval").value;
    await wait(interval);
    if(stopExecution) break;
  }
  showStat(stat);
}

const showLegend = function() {
  const gradation = getGradation(0, 100);
  const canvas = document.getElementById("gradation-canvas");
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const height = canvas.height;
  const width = canvas.width/100;
  for(let i = 0; i < 100; ++i) {
    ctx.fillStyle = gradation(i);
    ctx.fillRect(i*width, 0, width, height);
  }
};


window.addEventListener("load", function() {
  const canvas = document.getElementById("output");
  const width = document.querySelector(".sort-main").clientWidth;
  canvas.width = width - 20;
  console.log("set #output width", width);

  document.getElementById("exec-step-by-step").addEventListener("click", executeStepByStep);
  document.getElementById("stop-btn").addEventListener("click", function() {
    stopExecution = true;
    document.getElementById("exec-step-by-step").removeAttribute("disabled");
  })
  document.getElementById("reset-btn").addEventListener("click", function() {
    window.location.reload();
  })
  document.getElementById("save-btn").addEventListener("click", function() {
    const canvas = document.getElementById("output");
    const base64 = canvas.toDataURL("image/png");
    window.location.href = base64;
  })
  document.getElementById("gradation-type").addEventListener("change", showLegend);
  showLegend();
});

//width and height of the svg of the map
var width = 500,
  height = 900;

//Argentina's official map proyection is Gauss-Kruger but it's not supported by d3, so i'm using transverseMercator wich is the closest
//Argentina is between latitudes -55(lat1) and -22(lat2) and longitudes -74(long1) and -53(long2)
//lat -66 is at the center of the country so we need to use it for rotation and center
//the formula for center is y= (lat1 - lat2)/2 + lat2 and x = 66 - (long1 - long2)/2 + long2
//the formula for scale is (height * 56.5)/-(lat1 - lat2)
var projection = d3
  .geoTransverseMercator()
  .center([2.5, -38.5])
  .rotate([66, 0])
  .scale((height * 56.5) / 33)
  .translate([width / 2, height / 2]);

var svg = d3
  .select("#map-div-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

//Sets the projection for the map draw
var path = d3.geoPath().projection(projection);
svg.attr("d", path);

var covidAffectedTotals = [];

//default bubbles type is infected
var bubblesType = getFromLocalstorage("BubblesType", "infected");

function getFromLocalstorage(key, defaultValue) {
  var value = localStorage.getItem(key);
  if (value === null) {
    return defaultValue;
  }
  return value;
}

//loads the map cordinates from the json file
d3.json("/data/argentina_indec.json")
  .then(drawMap)
  .then(
    d3
      .csv("/data/affectedtotals.csv", readCsv)
      .then(buildTable)
      .then(drawBubbles)
  )
  .then(showMapDiv);

//topojson is the library im using to render the map
function drawMap(mapData) {
  svg
    .selectAll("path")
    .data(topojson.feature(mapData, mapData.objects.provincias).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");
}

function readCsv(d) {
  covidAffectedTotals.push(d);
}

function buildTable() {
  const tableContainer = d3.select("#table-div-container");
  const table = tableContainer.append("table");
  const thead = table.append("thead");
  const headRow = thead.append("tr");
  headRow.attr("class", "titles");
  const titles = ["Provincia", "Infectados", "Recuperados", "Fallecidos"];
  titles.forEach(function(t, i) {
    var tdata = headRow.append("td").text(t);
    if (i > 0) tdata.attr("class", "vertical");
  });
  const tbody = table.append("tbody");
  covidAffectedTotals.forEach(function(data, i) {
    var row = tbody.append("tr");
    row.attr("class", "datarow");
    row.append("td").text(data.name);
    row
      .append("td")
      .text(data.infected)
      .attr("class", "infected");
    row
      .append("td")
      .text(data.recovered)
      .attr("class", "recovered");
    row
      .append("td")
      .text(data.dead)
      .attr("class", "dead");
  });
}

//draws bubbles of info over the map
function drawBubbles() {
  //save chosen bubblesType
  localStorage.setItem("BubblesType", bubblesType);

  //tooltip box
  var tooltip = d3.select(".tooltip");

  //shows the tooltip box
  var mouseover = function(b) {
    tooltip.attr("class", "tooltip visible");
  };

  //sets the tooltip box text and position
  //tooltip position depends on mouse cursor position
  var mousemove = function(bubble) {
    tooltip.html(bubble["name"] + "<br> cantidad: " + bubble[bubblesType]);

    tooltip
      .style("top", event.pageY + "px")
      .style("left", event.pageX + 15 + "px");
  };

  //hides the tooltip box
  var mouseleave = function() {
    tooltip.attr("class", "tooltip");
  };

  //sets the scale for the buubles depending on the value and maxvalue
  function bubbleSize(value, maxValue) {
    var size = 0;
    if (value > 0) {
      //if value < 0 it doesn't draw the bubble
      var scale = d3
        .scaleLinear()
        .domain([1, maxValue]) // data range
        .range([5, 60]); // bubble range
      size = scale(value);
    }
    return size;
  }

  //gets the max value of an specific type from the covidAffectedTotals
  function maxValue(bubblesType) {
    var filteredTotals = covidAffectedTotals.map(a => a[bubblesType]);
    return Math.max.apply(Math, filteredTotals);
  }

  //removes previously drawn bubbles from the map
  d3.selectAll(".bubbles").remove();

  //draws the new bubbles
  svg
    .selectAll("bubbles")
    .data(covidAffectedTotals)
    .enter()
    .append("circle")
    .attr("cx", function(bubble) {
      return bubble.mapposx;
    })
    .attr("cy", function(bubble) {
      return bubble.mapposy;
    })
    .attr("r", function(bubble) {
      return bubbleSize(bubble[bubblesType], maxValue(bubblesType));
    })
    .attr("class", "bubbles bubbles-" + bubblesType)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
}

//draws infected type bubbles over the map
d3.select("#infected-button").on("click", function() {
  bubblesType = "infected";
  drawBubbles();
});

//draws dead type bubbles over the map
d3.select("#dead-button").on("click", function() {
  bubblesType = "dead";
  drawBubbles();
});

//draws recpvered type bubbles over the map
d3.select("#recovered-button").on("click", function() {
  bubblesType = "recovered";
  drawBubbles();
});

function showMapDiv() {
  d3.select("#map-div-wrapper").attr("class", null);
}

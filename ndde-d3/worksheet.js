// -------------------------------------------------------------------------
// USE THIS FILE WHILE ACTIVELY WORKING ON PROJECT
// -------------------------------------------------------------------------


// initial setup
const svg = d3.select("svg"),
	width = svg.attr("width"),
	height = svg.attr("height"),
	path = d3.geoPath(),
	data = d3.map(),
	GeoJSONUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
	disastersdata = "natural-disasters-decadal.csv";

let centered, world, worldmap;

function checkUrlStatus(url) {
	const xhr = new XMLHttpRequest();
	xhr.open('GET', url);
  
	xhr.onreadystatechange = function () {
	  if (xhr.readyState === 4) {
		if (xhr.status === 200) {
		  console.log('GeoJSON data loaded from url successfully');
		  return xhr.status;
		} else {
		  console.log('Reverted to loading GeoJSON data from local file - Status:', xhr.status, '- URL: ', GeoJSONUrl);
		  return xhr.status;
		}
	  }
	};

	xhr.send();
}

// Assign worldmap based on GeoJSONUrl status for Fault-Tolerance
if (checkUrlStatus(GeoJSONUrl) === "200") {
	worldmap = GeoJSONUrl;
} else {
	worldmap = "world.geojson";
}

// Array of years (decades) computed using create_decades_array() function in ./data-sanitizer.py
const decades = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]; 
// Year declaration (default: latest decade)
let year = decades[decades.length - 1];

// Variable to hold the currently selected impact data (default)
let selectedImpact = 'Number of deaths from disasters';

// style of geographic projection and scaling
const projection = d3.geoRobinson()
	.scale(130)
	.translate([width / 2, height / 2]);

// Define color scales for each impact type
const colorScales = {
	'Number of deaths from disasters': d3.scaleThreshold().domain([1, 10, 100, 1000, 10000, 1000000]).range(['#9EB7BE', '#FCD49E', '#FDBC84', '#FB8D59', '#EE6547', '#D72F1F', '#990000']),
	'Number of people injured from disasters': d3.scaleThreshold().domain([1, 100, 1000, 10000, 100000, 1000000]).range(['#9EB7BE', '#D4B9DA','#C994C7', '#DF65B0', '#E6298A', '#CE1256', '#91003F']),
	'Number of total people affected by disasters': d3.scaleThreshold().domain([1, 1000, 10000, 100000, 1000000, 10000000, 100000000]).range(['#9EB7BE', '#FEE0D2', '#FCBBA1', '#FC9272', '#FB6A49', '#EF3A2C', '#CA181D', '#99000D']),
	'Number of people left homeless from disasters': d3.scaleThreshold().domain([1, 10, 100, 1000, 10000, 100000, 1000000]).range(['#9EB7BE', '#E5F4F8', '#CCECE6', '#9AD8C8', '#66C2A4', '#41AE76', '#228B44','#015824']),
	'Total economic damages from disasters as a share of GDP': d3.scaleThreshold().domain([0.01, 0.05, 0.1, 0.5, 1, 10]).range(['#FEEDDE', '#FDD0A2', '#FCAD6B', '#FD8D3C', '#F06912', '#D94801', '#8C2D04'])
};

// add tooltip
const tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// Add clickable background
svg.append("rect")
  .attr("class", "background")
	.attr("width", width)
	.attr("height", height)
	.on("click", click);

// Load external data and boot
function loadAndDisplayData(selectedYear, currentSelectedImpact) {
    data.clear(); // Clear the previous data
    d3.queue()
        .defer(d3.json, worldmap)
        .defer(d3.csv, disastersdata, function(d) {
            if(d.Year == selectedYear) {
                // Use the selected impact data for the visualization
                data.set(d['Country code'], +d[currentSelectedImpact]);
            }
        })
        .await(ready);
}

// Initial map load with default values
loadAndDisplayData(year, selectedImpact);

// Update map based on impact data selection change
document.getElementById('dataSelect').addEventListener('change', function() {
	year = parseInt(document.getElementById('yearInput').value);
    selectedImpact = this.value;
    loadAndDisplayData(year, selectedImpact);
});

// Update map based on year input change
document.getElementById('yearInput').addEventListener('change', function() {
	year = parseInt(document.getElementById('yearInput').value);
	let revertToYear;

	function revertAction() {
		alert('Please enter a valid decade within the range 1900, 1910 ... 2000, 2010, 2020.');
		document.getElementById('yearInput').value = revertToYear;
		loadAndDisplayData(revertToYear, selectedImpact);
	}
	
	if (decades.includes(year)) {
		loadAndDisplayData(year, selectedImpact);
	} else if (year < decades[0]) {
		revertToYear = decades[0];
		revertAction();	// revert to the highest decade if decade entered is lower than last decade
	} else if (year > decades[decades.length - 1]) {
		revertToYear = decades[decades.length - 1];
		revertAction();	// revert to the highest decade if decade entered is lower than last decade
	} else {
		for (let i = 0; i < decades.length - 1; i++) {
			if (year >= decades[i] && year <= decades[i + 1]) {
			  // Check which decade is closer and revert to it
			  if (year - decades[i] <= decades[i + 1] - year) {
				revertToYear = decades[i];
				revertAction();
			  } else {
				revertToYear = decades[i + 1];
				revertAction();
			  }
			}
		}
	}
});

// Declare the world variable
world = svg.append("g")
.attr("class", "world");


// Time Lapse control
let timeLapseInterval;
const timeLapseDelay = 750; // Delay in milliseconds for time lapse
let timeLapseStoppedByUser = false; // Flag to track if time lapse was stopped by the user
let currentTimeLapseYearIndex = 0; // Variable to store the current year index of the time lapse

// Function to update the map for a given year
function updateTimeLapse(yearIndex) {
    if (yearIndex >= decades.length) {
        stopTimeLapse();
        return;
    }

    const year = decades[yearIndex];
    document.getElementById('yearInput').value = year;
    loadAndDisplayData(year, selectedImpact);

    // Set the next update if the current year is not the last one
    timeLapseInterval = setTimeout(() => {
        updateTimeLapse(yearIndex + 1);
    }, timeLapseDelay);

    // Update the current time lapse year index
    currentTimeLapseYearIndex = yearIndex;
}

// Function to toggle between Play and Pause
function toggleTimeLapse() {
    const button = document.getElementById('playTimeLapseButton');
    if (button.textContent === 'Play Time-Lapse') {
        // If the current time lapse year index is at the end, start from the beginning
        if (currentTimeLapseYearIndex >= decades.length) {
            currentTimeLapseYearIndex = 0;
        }
        button.textContent = 'Pause Time-Lapse';
        updateTimeLapse(currentTimeLapseYearIndex);
    } else {
        // Pause the time lapse
        button.textContent = 'Play Time-Lapse';
        clearTimeout(timeLapseInterval);
        timeLapseStoppedByUser = true;
    }
}

// Stop the time lapse
function stopTimeLapse() {
    clearTimeout(timeLapseInterval);
    timeLapseStoppedByUser = true; // Set the flag to indicate user manual stop
    document.getElementById('playTimeLapseButton').textContent = 'Play Time-Lapse';
    currentTimeLapseYearIndex = 0; // Reset the year index
}

// Function to handle double click and reset to the latest year
function resetToLatestYear() {
	clearTimeout(timeLapseInterval); // Stop any ongoing time lapse
    currentTimeLapseYearIndex = decades.length - 1; // Set to last index of decades
    updateTimeLapse(currentTimeLapseYearIndex);
    document.getElementById('playTimeLapseButton').textContent = 'Play Time-Lapse';
    timeLapseStoppedByUser = true; // Indicate that the reset was user-initiated
}

// Ensure the DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    const playTimeLapseButton = document.getElementById('playTimeLapseButton');

    // Set initial text for the button
    playTimeLapseButton.textContent = 'Play Time-Lapse';

    // Add event listener for single click to the Play/Pause button
    playTimeLapseButton.addEventListener('click', toggleTimeLapse);

    // Add event listener for double click to reset to the latest year
    playTimeLapseButton.addEventListener('dblclick', resetToLatestYear);
});



// ----------------------------
//Start of Choropleth drawing
// ----------------------------

function ready(error, topo) {
	// topo is the data received from the d3.queue function (the world.geojson)
	// the data from world_population.csv (country code and country population) is saved in data variable
	if (error) throw error;

	// Clear previous map paths (if any)
    world.selectAll("path").remove();

	let impactText;
	switch (selectedImpact) {
		case "Number of deaths from disasters":
			impactText = "deaths";
			break;
		case "Number of people injured from disasters":
			impactText = "injured";
			break;
		case "Number of total people affected by disasters":
			impactText = "affected";
			break;
		case "Number of people left homeless from disasters":
			impactText = "homeless";
			break;
		case "Total economic damages from disasters as a share of GDP":
			impactText = "% of GDP"
	}

	let mouseOver = function(d) {
		d3.selectAll(".Country")
			.transition()
			.duration(200)
			.style("opacity", .5)
			.style("stroke", "transparent");
		d3.select(this)
			.transition()
			.duration(200)
			.style("opacity", 1)
			.style("stroke", "black");

		let value = data.get(d.id) || 0;
		
		if (selectedImpact == "Total economic damages from disasters as a share of GDP") {
			tooltip.style("left", (d3.event.pageX + 15) + "px")
			.style("top", (d3.event.pageY - 28) + "px")
			.transition().duration(400)
			.style("opacity", 1)
			.text(d.properties.name + ': ' + value.toFixed(2) + impactText); // Text displayed for selectedImpact
		} else {
			tooltip.style("left", (d3.event.pageX + 15) + "px")
			.style("top", (d3.event.pageY - 28) + "px")
			.transition().duration(400)
			.style("opacity", 1)
			.text(d.properties.name + ': ' + (Math.round(value)).toLocaleString() + ' ' + impactText); // Text displayed for selectedImpact
		}	
	}

	let mouseLeave = function() {
		d3.selectAll(".Country")
			.transition()
			.duration(200)
			.style("opacity", 1)
			.style("stroke", "transparent");
		tooltip.transition().duration(300)
			.style("opacity", 0);
	}

	// Draw the map
	world.selectAll("path")
		.data(topo.features)
		.enter()
		.append("path")
		// draw each country
		// d3.geoPath() is a built-in function of d3 v4 and takes care of showing the map from a properly formatted geojson file, if necessary filtering it through a predefined geographic projection
		.attr("d", d3.geoPath().projection(projection))

		//retrieve the name of the country from data
		.attr("data-name", function(d) {
			return d.properties.name
		})

		// set the color of each country
		.attr("fill", function(d) {
			let value = data.get(d.id) || 0;
			return colorScales[selectedImpact](value);
		})

		// add a class, styling and mouseover/mouseleave and click functions
		.style("stroke", "transparent")
		.attr("class", function(d) {
			return "Country"
		})
		.attr("id", function(d) {
			return d.id
		})
		.style("opacity", 1)
		.on("mouseover", mouseOver)
		.on("mouseleave", mouseLeave)
		.on("click", click);
  
	// Legend
	const x = d3.scaleLinear()
		.domain([2.6, 75.1])
		.rangeRound([600, 860]);


	// Update the legend based on the current color scale
	function updateLegend(currentScale) {
		// Clear any existing legend before drawing a new one
		svg.select("#legend").remove();
		
		// Draw a new legend based on the updated color scale
		const legend = svg.append("g")
			.attr("id", "legend");

		const legend_entry = legend.selectAll("g.legend_entry")
			.data(currentScale.range().map(function(color) {
				const d = currentScale.invertExtent(color);
				if (d[0] == null) d[0] = currentScale.domain()[0];
				if (d[1] == null) d[1] = currentScale.domain()[1];
				return d;
			}))
			.enter().append("g")
			.attr("class", "legend_entry");

		const ls_w = 20,
			ls_h = 20;

		legend_entry.append("rect")
			.attr("x", 0)
			.attr("y", function(d, i) {
				return height - (i * ls_h) - 2 * ls_h;
			})
			.attr("width", ls_w)
			.attr("height", ls_h)
			.style("fill", function(d) {
				return currentScale(d[0]);
			})
			.style("opacity", 0.8);


        function formatNumberForLegend(d) {
            let value = +d;
            if (value >= 1e9) {
                return (value / 1e9) + " billion";
            } else if (value >= 1e6) {
                return (value / 1e6) + " million";
            } else if (value >= 1e3) {
                return value.toLocaleString();
            }
            return value.toString(); // return as is for values less than a thousand
        }

        if (selectedImpact === 'Total economic damages from disasters as a share of GDP') {
            legend_entry.append("text")
                .attr("x", 30)
                .attr("y", function(d, i) {
                    return height - (i * ls_h) - ls_h - 6;
                })
                .text(function(d, i) {
                    let formattedLower = formatNumberForLegend(d[0]);
                    let formattedUpper = formatNumberForLegend(d[1]);

                    if (i === 0) return "< " + formattedUpper + impactText;
                    if (d[1] < d[0]) return "over " + formattedLower + impactText;
                    return formattedLower + " - " + formattedUpper + impactText;
                });
        } else {
            legend_entry.append("text")
                .attr("x", 30)
                .attr("y", function(d, i) {
                    return height - (i * ls_h) - ls_h - 6;
                })
                .text(function(d, i) {
                    let formattedLower = formatNumberForLegend(d[0]);
                    let formattedUpper = formatNumberForLegend(d[1]);

                    if (i === 0) return "< " + formattedUpper + " " + impactText;
                    if (d[1] < d[0]) return "over " + formattedLower + " " + impactText;
                    return formattedLower + " - " + formattedUpper + " " + impactText;
                });
        }
        
		legend.append("text")
            .attr("x", 0)
            .attr("y", function(d, i) {
                return height - (i * ls_h) - 2.5; // to place above --> ´ .attr("y", 300) ´; // adjust to fit
            })
            .text(selectedImpact);
	}

	// Call updateLegend function with the correct scale after map is drawn
	updateLegend(colorScales[selectedImpact]);
}

// Zoom functionality
function click(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = -(centroid[0] * 6);
    y = (centroid[1] * 6);
    k = 3;
    centered = d;
  } else {
    x = 0;
    y = 0;
    k = 1;
    centered = null;
  }

  world.selectAll("path")
      .classed("active", centered && function(d) { return d === centered; });

  world.transition()
      .duration(750)
      .attr("transform", "translate(" + x + "," + y + ") scale(" + k + ")" );
  
}

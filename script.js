// (It's CSV, but GitHub Pages only gzip's JSON at the moment.)
d3.csv('head.csv', function(error, flights) {

  // Various formatters.
  var formatNumber = d3.format(',d');
  var formatChanged = d3.format('+,d');
  var formatDate = d3.time.format('%B %d, %Y');
  var formatTime = d3.time.format('%I:%M %p');

  // A nest operator, for grouping the flight list.
  var nestByDate = d3.nest()
      .key(function(d) { return d3.time.day(d.date); });

  // Example data
  //date              , calories , gsr        , heart-rate , skin-temp , steps
  //2015-06-28 17:00Z , 2        , 0.10887    , 59         , 93.2      , 0
  //2015-06-28 17:01Z , 2.1      , 0.00135857 , 66         , 92.3      , 0

  // A little coercion, since the CSV is untyped.
  flights.forEach(function(d, i) {
    d.index = i;
    d.date = parseDate(d.date);
    d.calories = parseFloat(d.calories);
    d.gsr = parseFloat(d.gsr);
    d.steps = +d.steps;
    d.heartRate = +d['heart-rate'];
    d.skinTemp = +d['skin-temp'];
  });

  // Create the crossfilter for the relevant dimensions and groups.
  var flight = crossfilter(flights);
  var all = flight.groupAll();
  var date = flight.dimension(function(d) { return d.date; });
  var dates = date.group(d3.time.day);
  var hour = flight.dimension(function(d) { return d.date.getHours() + d.date.getMinutes() / 60; });
  var hours = hour.group(Math.floor);
  var calorie = flight.dimension(function(d) { return d.calories; });
  var calories = calorie.group(function(d){ return d });
  var gsr = flight.dimension(function(d) { return d.gsr; });
  var gsrs  =  gsr.group(function(d) { return Math.floor(d / 0.00025) * 0.00025; });
  var step = flight.dimension(function(d) { return d.steps; });
  var steps = step.group(Math.floor);
  var heartRate = flight.dimension(function(d) { return d.heartRate; });
  var heartRates =  heartRate.group(function(d) { return Math.floor(d / 5) * 5; });
  var skinTemp = flight.dimension(function(d) { return d.skinTemp; });
  var skinTemps = skinTemp.group(Math.floor);

  //var delay = flight.dimension(function(d) { return Math.max(-60, Math.min(149, d.delay)); });
  //var delays = delay.group(function(d) { return Math.floor(d / 10) * 10; });
  //var distance = flight.dimension(function(d) { return Math.min(1999, d.distance); });
  //var distances = distance.group(function(d) { return Math.floor(d / 50) * 50; });

  var charts = [

    barChart()
        .dimension(hour)
        .group(hours)
      .x(d3.scale.linear()
        .domain([0, 24])
        .rangeRound([0, 10 * 24])),

    barChart()
        .dimension(calorie)
        .group(calories)
      .x(d3.scale.linear()
        .domain([0, 5])
        .rangeRound([0, 10 * 21])),

    barChart()
        .dimension(gsr)
        .group(gsrs)
      .x(d3.scale.linear()
        .domain([0.00001, 0.01])
        .rangeRound([0, 10 * 40])),

    barChart()
        .dimension(skinTemp)
        .group(skinTemps)
      .x(d3.scale.linear()
        .domain([80, 105])
        .rangeRound([0, 10 * 40])),

    barChart()
        .dimension(heartRate)
        .group(heartRates)
      .x(d3.scale.linear()
        .domain([30, 200])
        .rangeRound([0, 10 * 40])),

    barChart()
        .dimension(step)
        .group(steps)
      .x(d3.scale.linear()
        .domain([0, 200])
        .rangeRound([0, 10 * 40])),

    barChart()
        .dimension(date)
        .group(dates)
        .round(d3.time.day.round)
      .x(d3.time.scale()
        .domain([flights[0].date, flights[flights.length - 1].date])
        .rangeRound([0, 10 * 90]))
        .filter([flights[0].date, flights[flights.length - 1].date])

  ];

  // Given our array of charts, which we assume are in the same order as the
  // .chart elements in the DOM, bind the charts to the DOM and render them.
  // We also listen to the chart's brush events to update the display.
  var chart = d3.selectAll('.chart')
      .data(charts)
      .each(function(chart) { chart.on('brush', renderAll).on('brushend', renderAll); });

  // Render the initial lists.
  var list = d3.selectAll('.list')
      .data([flightList]);

  // Render the total.
  d3.selectAll('#total')
      .text(formatNumber(flight.size()));

  renderAll();

  // Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
    list.each(render);
    d3.select('#active').text(formatNumber(all.value()));
  }

  // Like d3.time.format, but faster.
  function parseDate(d) {
    return new Date(d);
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  window.reset = function(i) {
    charts[i].filter(null);
    renderAll();
  };

  function flightList(div) {
    var flightsByDate = nestByDate.entries(date.top(40));

    div.each(function() {
      var date = d3.select(this).selectAll('.date')
          .data(flightsByDate, function(d) { return d.key; });

      date.enter().append('div')
          .attr('class', 'date')
        .append('div')
          .attr('class', 'day')
          .text(function(d) { return formatDate(d.values[0].date); });

      date.exit().remove();

      var flight = date.order().selectAll('.flight')
          .data(function(d) { return d.values; }, function(d) { return d.index; });

      var flightEnter = flight.enter().append('div')
          .attr('class', 'flight');

      flightEnter.append('div')
          .attr('class', 'time')
          .text(function(d) { return formatTime(d.date); });

      flightEnter.append('div')
          .attr('class', 'gsr')
          .text(function(d) { return d.gsr; });

      flightEnter.append('div')
          .attr('class', 'steps')
          .text(function(d) { return d.steps; });

      flightEnter.append('div')
          .attr('class', 'calories')
          .text(function(d) { return d.calories; });

      flightEnter.append('div')
          .attr('class', 'heartRate')
          .text(function(d) { return d.heartRate; });

      flight.exit().remove();

      flight.order();
    });
  }

  function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 10};
    var x;
    var y = d3.scale.linear().range([100, 0]);
    var id = barChart.id++;
    var axis = d3.svg.axis().orient('bottom');
    var brush = d3.svg.brush();
    var brushDirty;
    var dimension;
    var group;
    var round;

    function chart(div) {
      var width = x.range()[1];
      var height = y.range()[0];

      y.domain([0, group.top(1)[0].value]);

      div.each(function() {
        var div = d3.select(this);
        var g = div.select('g');

        // Create the skeletal chart.
        if (g.empty()) {
          div.select('.title').append('a')
              .attr('href', 'javascript:reset(' + id + ')')
              .attr('class', 'reset')
              .text('reset')
              .style('display', 'none');

          g = div.append('svg')
              .attr('width', width + margin.left + margin.right)
              .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          g.append('clipPath')
              .attr('id', 'clip-' + id)
            .append('rect')
              .attr('width', width)
              .attr('height', height);

          g.selectAll('.bar')
              .data(['background', 'foreground'])
            .enter().append('path')
              .attr('class', function(d) { return d + ' bar'; })
              .datum(group.all());

          g.selectAll('.foreground.bar')
              .attr('clip-path', 'url(#clip-' + id + ')');

          g.append('g')
              .attr('class', 'axis')
              .attr('transform', 'translate(0,' + height + ')')
              .call(axis);

          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append('g').attr('class', 'brush').call(brush);
          gBrush.selectAll('rect').attr('height', height);
          gBrush.selectAll('.resize').append('path').attr('d', resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll('.brush').call(brush);
          div.select('.title a').style('display', brush.empty() ? 'none' : null);
          if (brush.empty()) {
            g.selectAll('#clip-' + id + ' rect')
                .attr('x', 0)
                .attr('width', width);
          } else {
            var extent = brush.extent();
            g.selectAll('#clip-' + id + ' rect')
                .attr('x', x(extent[0]))
                .attr('width', x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll('.bar').attr('d', barPath);
      });

      function barPath(groups) {
        var path = [];
        var i = -1;
        var n = groups.length;
        var d;
        while (++i < n) {
          d = groups[i];
          path.push('M', x(d.key), ',', height, 'V', y(d.value), 'h9V', height);
        }
        return path.join('');
      }

      function resizePath(d) {
        var e = +(d == 'e');
        var x = e ? 1 : -1;
        var y = height / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
      }
    }

    brush.on('brushstart.chart', function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select('.title a').style('display', null);
    });

    brush.on('brush.chart', function() {
      var g = d3.select(this.parentNode);
      var extent = brush.extent();
      if (round) g.select('.brush')
          .call(brush.extent(extent = extent.map(round)))
        .selectAll('.resize')
          .style('display', null);
      g.select('#clip-' + id + ' rect')
          .attr('x', x(extent[0]))
          .attr('width', x(extent[1]) - x(extent[0]));
      dimension.filterRange(extent);
    });

    brush.on('brushend.chart', function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select('.title a').style('display', 'none');
        div.select('#clip-' + id + ' rect').attr('x', null).attr('width', '100%');
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, 'on');
  }
});


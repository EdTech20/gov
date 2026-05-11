import ApexCharts from "apexcharts";

const chart03 = () => {
  const chartData = {
    records: {
      series: [
        {
          name: "Citizens",
          data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
        },
        {
          name: "Revenue",
          data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
        },
      ],
      title: "Citizen Registration Trends",
      description: "Monthly record of new citizen registrations",
    },
    permits: {
      series: [
        {
          name: "Issued",
          data: [120, 140, 110, 130, 150, 140, 160, 180, 170, 190, 210, 200],
        },
        {
          name: "Pending",
          data: [30, 40, 20, 35, 45, 30, 50, 60, 55, 65, 75, 70],
        },
      ],
      title: "Permit Application Trends",
      description: "Monthly record of permit applications and approvals",
    },
    revenue: {
      series: [
        {
          name: "Tax Revenue",
          data: [200, 220, 210, 230, 250, 240, 260, 300, 290, 310, 330, 320],
        },
        {
          name: "Fee Revenue",
          data: [60, 70, 50, 80, 90, 70, 100, 120, 110, 130, 150, 140],
        },
      ],
      title: "Revenue Collection Trends",
      description: "Monthly record of tax and fee collections",
    },
  };

  const chartThreeOptions = {
    series: chartData.records.series,
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: {
        show: false,
      },
    },
    fill: {
      gradient: {
        enabled: true,
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    stroke: {
      curve: "straight",
      width: ["2", "2"],
    },

    markers: {
      size: 0,
    },
    labels: {
      show: false,
      position: "top",
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      x: {
        format: "dd MMM yyyy",
      },
    },
    xaxis: {
      type: "category",
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: false,
    },
    yaxis: {
      title: {
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const chartSelector = document.querySelectorAll("#chartThree");

  if (chartSelector.length) {
    const chartThree = new ApexCharts(
      document.querySelector("#chartThree"),
      chartThreeOptions,
    );
    chartThree.render();

    // Expose update function to window so Alpine can call it
    window.updateChartThree = (tab) => {
      if (chartData[tab]) {
        chartThree.updateSeries(chartData[tab].series);
        
        // Also update titles if they exist in the DOM
        const titleEl = document.querySelector("#chartThreeTitle");
        const descEl = document.querySelector("#chartThreeDesc");
        if (titleEl) titleEl.innerText = chartData[tab].title;
        if (descEl) descEl.innerText = chartData[tab].description;
      }
    };
  }
};

export default chart03;

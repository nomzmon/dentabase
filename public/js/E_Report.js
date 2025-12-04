let appointmentsChart;

document.addEventListener('DOMContentLoaded', () => {
    // Combine both Registered Patients and Walk-in Patients
    function getCombinedData(){
        const appointments = rawAppointmentData.map(appt => ({
            date: appt.date,
            service: appt.service,
            type: 'Appointment'
        }));
        const walkIns = rawWalkIns.map(walkIn => ({
            date: walkIn.date,
            service: walkIn.service,
            type: 'Walk-In'
        }));
        return [...appointments, ...walkIns];
    }
    const combinedPatientData = getCombinedData();

    function getMonthlyData(year, serviceType){
        const filtered = combinedPatientData.filter(appt => {
            if (!appt.date) return false;
            const apptDate = new Date(appt.date);
            const apptYear = apptDate.getFullYear().toString();
            const isYearMatch = (year === "All") || (apptYear === year);
            const isServiceMatch = (serviceType === "All") || (appt.service === serviceType);
            return isYearMatch && isServiceMatch;
        });

        const totalCountEl = document.getElementById("totalApptCount");
        if (totalCountEl) totalCountEl.innerText = filtered.length;
        const appointmentCounts = Array(12).fill(0);
        const walkInCounts = Array(12).fill(0);

        filtered.forEach(item => {
            const monthIndex = new Date(item.date).getMonth();
            if (monthIndex >= 0 && monthIndex <= 11){
                if (item.type === 'Appointment'){
                    appointmentCounts[monthIndex]++;
                } else if (item.type === 'Walk-In'){
                    walkInCounts[monthIndex]++;
                }
            }
        });

        return{
            appointments: appointmentCounts,
            walkIns: walkInCounts
        };
    }

    const defaultYear = "All";
    const defaultService = "All";

    const initialData = getMonthlyData(defaultYear, defaultService);
    const ctx = document.getElementById('appointmentsChart').getContext('2d');
    let appointmentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: `Appointments`,
                data: initialData.appointments,
                backgroundColor: '#4a69bd',
                borderColor: '#2c3e50',
                borderWidth: 1,
                borderRadius: 4,
                stack: 'combined',
            },
            {
                label: `Walk-Ins`,
                data: initialData.walkIns,
                backgroundColor: '#FF6384',
                borderColor: '#C94762',
                borderWidth: 1,
                borderRadius: 4,
                stack: 'combined', 
            }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    stacked: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            },
            plugins: {
                    title: {
                    display: true,
                    text: `Monthly Patient Counts (${defaultYear})`
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
    const filterBtn = document.getElementById("applyApptFilterBtn");
    if (filterBtn){
        filterBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const selectedYear = document.getElementById("apptYearSelect").value;
            const selectedService = document.getElementById("apptServiceSelect").value;
            const newData = getMonthlyData(selectedYear, selectedService);

            let titleText = `Monthly Patient Counts (${selectedYear})`;
            appointmentsChart.data.datasets[0].data = newData.appointments;
            appointmentsChart.data.datasets[1].data = newData.walkIns;

            appointmentsChart.options.plugins.title.text = titleText;

            appointmentsChart.update();
        });
    }

    // Second Chart
    const monthMap = [
        {value: 0, month: 'Jan'}, {value: 1, month: 'Feb'}, {value: 2, month: 'Mar'},
        {value: 3, month: 'Apr'}, {value: 4, month: 'May'}, {value: 5, month: 'Jun'},
        {value: 6, month: 'Jul'}, {value: 7, month: 'Aug'}, {value: 8, month: 'Sep'},
        {value: 9, month: 'Oct'}, {value: 10, month: 'Nov'}, {value: 11, month: 'Dec'}
    ];
    function calculateRevenueTrends(selectedYear, selectedService) {
        let monthlyTotals = {};
        monthMap.forEach(m => monthlyTotals[m.value] = 0);
        rawAppointmentData.forEach(appt => {
            if (!appt.date || !appt.amount || !appt.service) return;
            const d = new Date(appt.date);
            const apptYear = d.getFullYear().toString();
            const apptMonthIndex = d.getMonth();
            const amount = parseFloat(appt.amount);
            const yearMatch = (selectedYear === "All") || (apptYear === selectedYear);
            const serviceMatch = (selectedService === "All") || (appt.service === selectedService);
            if (yearMatch && serviceMatch) {
                monthlyTotals[apptMonthIndex] += amount;
            }
        });
        return monthMap.map(m => monthlyTotals[m.value]);
    }

    const revCtx = document.getElementById('revenueChart');
    
    if (revCtx) {
        const initialData = calculateRevenueTrends("All", "All");

        window.revenueChart = new Chart(revCtx.getContext('2d'), {
            type: 'line', 
            data: {
                labels: monthMap.map(m => m.month), 
                datasets: [{
                    label: 'Revenue',
                    data: initialData, 
                    backgroundColor: '#4a69bd',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' $' + context.raw.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });
        const updateBtn = document.getElementById('applyRevFilterBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', (e) => {
                e.preventDefault();

                const yearVal = document.getElementById('revYearSelect').value;
                const serviceVal = document.getElementById('revServiceSelect').value;
                console.log(`Filtering Revenue: Year=${yearVal}, Service=${serviceVal}`);
                const newData = calculateRevenueTrends(yearVal, serviceVal);
                window.revenueChart.data.datasets[0].data = newData;
                window.revenueChart.data.datasets[0].label = `Revenue (${serviceVal})`;
                
                window.revenueChart.update();
            });
        }
    }
});

function getPeakTimesDataMatrix(year) {
    const startHour = 8;
    const endHour = 19;
    const hoursCount = endHour - startHour;

    const matrix = Array.from({ length: 7 }, () => Array(hoursCount).fill(0));

    const allAppointments = rawAppointmentData.concat(rawWalkIns).filter(appt => {
        if (!appt.date) return false;

        const start = new Date(appt.startTime || appt.date);
        const end = appt.endTime
            ? new Date(appt.endTime.includes('T') ? appt.endTime : `${appt.date}T${appt.endTime}`)
            : new Date(start.getTime() + 1 * 60 * 60 * 1000);

        const apptYear = start.getFullYear().toString();
        if (year !== "All" && apptYear !== year) return false;

        let current = new Date(start);
        while (current < end) {
            const hour = current.getHours();
            const day = current.getDay();
            if (hour >= startHour && hour < endHour) {
                matrix[day][hour - startHour]++;
            }
            current.setHours(current.getHours() + 1);
        }

        return true;
    });

    const data = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < hoursCount; hour++) {
            data.push({ x: hour, y: day, v: matrix[day][hour] });
        }
    }

    return { data, startHour, endHour };
}

const dayLabels = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const peakCtx = document.getElementById('peakTimesChart');
if (peakCtx) {
    const { data: heatmapData, startHour, endHour } = getPeakTimesDataMatrix("All");

    window.peakTimesChart = new Chart(peakCtx.getContext('2d'), {
        type: 'matrix',
        data: {
            datasets: [{
                label: '',
                data: heatmapData,
                backgroundColor: ctx => {
                    const v = ctx.dataset.data[ctx.dataIndex].v;
                    const alpha = Math.min(0.1 + v / 5, 1);
                    return `rgba(74,105,189,${alpha})`;
                },
                width: ctx => (ctx.chart.chartArea || {}).width / (endHour - startHour) - 2,
                height: ctx => (ctx.chart.chartArea || {}).height / 7 - 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { 
                    display: true, 
                    text: 'Peak Appointment Times (8am-6pm)',
                    padding: { top: 20, bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: function(ctx) {
                            const day = dayLabels[ctx.raw.y];
                            const hour = ctx.raw.x + startHour;
                            const count = ctx.raw.v;
                            return `${day}, ${hour}:00 - ${hour+1}:00 : ${count} appointment${count !== 1 ? 's' : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: endHour - startHour - 1,
                    ticks: {
                        stepSize: 1,
                        callback: v => `${v + startHour}:00`,
                        padding: 10
                    },
                    title: { display: true, text: 'Hour of Day' },
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    max: 6,
                    ticks: {
                        stepSize: 1,
                        callback: v => dayLabels[v]
                    },
                    title: { display: true, text: 'Day of Week' },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

document.getElementById("applyPeakFilterBtn")?.addEventListener("click", () => {
    const year = document.getElementById("peakYearSelect").value;
    const { data: newData } = getPeakTimesDataMatrix(year);
    window.peakTimesChart.data.datasets[0].data = newData;
    window.peakTimesChart.update();
});

function getServiceRevenueData(year) {
    const allAppointments = rawAppointmentData.concat(rawWalkIns);

    const revenueMap = {};

    allAppointments.forEach(appt => {
        const start = new Date(appt.startTime || appt.date);
        const apptYear = start.getFullYear().toString();
        if (year !== "All" && apptYear !== year) return;

        const service = appt.service || "Unknown";
        const amount = parseFloat(appt.amount || appt.amountCharged || 0);

        if (!revenueMap[service]) revenueMap[service] = 0;
        revenueMap[service] += amount;
    });

    const labels = Object.keys(revenueMap);
    const data = labels.map(label => revenueMap[label]);

    return { labels, data };
}


const revenueCtx = document.getElementById('serviceRevenueChart');
if (revenueCtx) {
    const { labels, data } = getServiceRevenueData("All");

    window.serviceRevenueChart = new Chart(revenueCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#4a69bd', '#e55039', '#f6b93b', '#78e08f',
                    '#60a3bc', '#fa983a', '#b8e994', '#6a89cc'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Service Revenue Contribution',
                    padding: { top: 20, bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.chart._metasets[context.datasetIndex].total;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ₱${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}


document.getElementById("applyRevenueFilterBtn")?.addEventListener("click", () => {
    const year = document.getElementById("revenueYearSelect").value;
    const { labels, data } = getServiceRevenueData(year);

    window.serviceRevenueChart.data.labels = labels;
    window.serviceRevenueChart.data.datasets[0].data = data;
    window.serviceRevenueChart.update();
});


let appointmentsChart;

document.addEventListener('DOMContentLoaded', () => {
    function getMonthlyData(year, serviceType) {
        const filtered = rawAppointmentData.filter(appt => {
            if (!appt.date) return false; 
            const apptDate = new Date(appt.date);
            const apptYear = apptDate.getFullYear().toString();
            const isYearMatch = (year === "All") || (apptYear === year);
            console.log(appt)
            const isServiceMatch = (serviceType === "All") || (appt.service === serviceType);
            return isYearMatch && isServiceMatch;
        });

        const totalCountEl = document.getElementById("totalApptCount");
        if (totalCountEl) totalCountEl.innerText = filtered.length;
        const counts = Array(12).fill(0);
        filtered.forEach(appt => {
            const monthIndex = new Date(appt.date).getMonth(); 
            if (monthIndex >= 0 && monthIndex <= 11) {
                counts[monthIndex]++;
            }
        });
        return counts;
    }
    const defaultYear = "All";
    const defaultService = "All"; 

    const initialData = getMonthlyData(defaultYear, defaultService);
    const ctx = document.getElementById('appointmentsChart').getContext('2d');
    appointmentsChart = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: `Appointments (${defaultYear})`,
                data: initialData,
                backgroundColor: '#4a69bd', 
                borderColor: '#2c3e50',   
                borderWidth: 1,
                borderRadius: 4,          
                barPercentage: 0.6          
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    grid: {
                        display: false
                    }
                },
                x: {
                    beginAtZero: true, 
                    ticks: { 
                        stepSize: 1,
                        precision: 0 
                    } 
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    const filterBtn = document.getElementById("applyApptFilterBtn");
    if (filterBtn) {
        filterBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const selectedYear = document.getElementById("apptYearSelect").value;
            const selectedService = document.getElementById("apptServiceSelect").value;
            const newData = getMonthlyData(selectedYear, selectedService);
            let labelText = `Appointments (${selectedYear})`;
            if (selectedYear === "All") {
                labelText = "Appointments (All Years)";
            }
            appointmentsChart.data.datasets[0].data = newData;
            appointmentsChart.data.datasets[0].label = labelText;
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
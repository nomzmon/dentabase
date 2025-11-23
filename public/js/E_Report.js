let appointmentsChart;

document.addEventListener('DOMContentLoaded', () => {
    function getMonthlyData(year, serviceType) {
        const filtered = rawAppointmentData.filter(appt => {
            if (!appt.date) return false; 
            const apptDate = new Date(appt.date);
            const apptYear = apptDate.getFullYear().toString();
            const isYearMatch = (year === "All") || (apptYear === year);
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
});
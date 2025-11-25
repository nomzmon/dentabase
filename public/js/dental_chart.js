// --- GLOBAL STATE ---
let currentMode = 'paint'; 
let currentTool = 'cond-treatment';
let currentText = ''; 
let selectedToothDiv = null; 

const quadrants = {
    q1: { start: 18, end: 11, pos: 'top' }, q2: { start: 21, end: 28, pos: 'top' }, 
    q3: { start: 31, end: 38, pos: 'bottom' }, q4: { start: 48, end: 41, pos: 'bottom' }, 
    q5: { start: 55, end: 51, pos: 'top' }, q6: { start: 61, end: 65, pos: 'top' }, 
    q7: { start: 71, end: 75, pos: 'bottom' }, q8: { start: 85, end: 81, pos: 'bottom' }  
};

// --- INITIALIZATION ---
function initDentalChart() {
    console.log("Initializing Dental Chart...");
    
    // 1. Build the Teeth
    for (const [qId, config] of Object.entries(quadrants)) {
        const container = document.getElementById(qId);
        if(!container) continue; 
        
        const isAsc = config.end > config.start;
        container.innerHTML = ''; // Clear to prevent duplicates
        
        if (isAsc) {
            for (let i = config.start; i <= config.end; i++) container.appendChild(createTooth(i, config.pos));
        } else {
            for (let i = config.start; i >= config.end; i--) container.appendChild(createTooth(i, config.pos));
        }
    }

    // 2. Setup Note Auto-save listener
    const noteInput = document.getElementById('tooth-note-input');
    if(noteInput) {
        noteInput.addEventListener('input', function(e) {
            if(selectedToothDiv) {
                selectedToothDiv.dataset.note = e.target.value;
            }
        });
    }

    // 3. CHECK FOR SAVED DATA (This is the new part)
    // We look for global variables injected by your HBS file
    if (typeof savedDentalChart !== 'undefined' && savedDentalChart) {
        console.log("Found saved chart data, loading...", savedDentalChart);
        loadChartData(savedDentalChart);
    }
    if (typeof savedDentalExam !== 'undefined' && savedDentalExam) {
        console.log("Found saved exam data, loading...", savedDentalExam);
        loadExamData(savedDentalExam);
    }
}

// --- HELPER: LOAD DATA ---
function loadChartData(data) {
    if(!data || data.length === 0) return;
    
    data.forEach(t => {
        // Find the tooth div by ID
        const toothDiv = document.querySelector(`.tooth-container[data-id='${t.id}']`);
        if(!toothDiv) return;

        // Restore Missing Status
        if(t.missing) toothDiv.classList.add('missing');
        
        // Restore Text Code
        if(t.text) toothDiv.querySelector('.status-box').value = t.text;
        
        // Restore Note
        if(t.note) toothDiv.dataset.note = t.note;

        // Restore Surfaces Colors
        if(t.surfaces) {
            for (const [surf, colorClass] of Object.entries(t.surfaces)) {
                const sDiv = toothDiv.querySelector(`.surface[data-surf='${surf}']`);
                if(sDiv) sDiv.classList.add(colorClass);
            }
        }
    });
}

function loadExamData(data) {
    if(!data) return;

    // X-Ray Loading
    if(data.xray) {
        $('#xray-pa').prop('checked', data.xray.periapical);
        $('#xray-pa-th').val(data.xray.periapicalTooth || "");
        $('#xray-pano').prop('checked', data.xray.panoramic);
        $('#xray-ceph').prop('checked', data.xray.cephalometric);
        $('#xray-occ').prop('checked', data.xray.occlusal);
        $('#xray-other').val(data.xray.others || "");
    }

    // Perio Loading
    if(data.perio) {
        $('#perio-ging').prop('checked', data.perio.gingivitis);
        $('#perio-early').prop('checked', data.perio.early);
        $('#perio-mod').prop('checked', data.perio.moderate);
        $('#perio-adv').prop('checked', data.perio.advanced);
    }

    // Occlusion Loading
    if(data.occlusion) {
        $('#occ-class').val(data.occlusion.class || "");
        $('#occ-overjet').val(data.occlusion.overjet || "");
        $('#occ-overbite').val(data.occlusion.overbite || "");
    }

    // Appliances Loading
    if(data.appliances) {
        $('#app-ortho').prop('checked', data.appliances.ortho);
        $('#app-stay').prop('checked', data.appliances.stayplate);
    }
}

// --- DOM ELEMENTS CREATION ---
function createTooth(id, pos) {
    const wrap = document.createElement('div');
    wrap.className = 'tooth-container';
    wrap.dataset.id = id;
    wrap.onclick = (e) => selectTooth(wrap);

    const box = document.createElement('input');
    box.className = 'status-box';
    box.type = 'text';
    box.readOnly = true;

    const num = document.createElement('div');
    num.className = 'tooth-num';
    num.innerText = id;

    const graphic = document.createElement('div');
    graphic.className = 'tooth-graphic';

    const surfs = [{c:'s-top',d:'B/L'},{c:'s-right',d:'D'},{c:'s-bottom',d:'B/L'},{c:'s-left',d:'M'},{c:'s-center',d:'O'}];
    
    surfs.forEach(s => {
        const div = document.createElement('div');
        div.className = `surface ${s.c}`;
        div.dataset.surf = s.d;
        div.onclick = (e) => handlePaint(e, wrap, box);
        graphic.appendChild(div);
    });

    if(pos === 'top') { wrap.append(box, graphic, num); } else { wrap.append(num, graphic, box); }
    return wrap;
}

// --- INTERACTION LOGIC ---
function selectTooth(toothDiv) {
    if(selectedToothDiv) selectedToothDiv.classList.remove('selected');
    selectedToothDiv = toothDiv;
    selectedToothDiv.classList.add('selected');

    $('#notes-panel').show();
    $('#selected-tooth-id').text(toothDiv.dataset.id);
    $('#tooth-note-input').val(toothDiv.dataset.note || "");
    
    if(currentMode === 'text' && currentText) {
        toothDiv.querySelector('.status-box').value = currentText;
    }
}

function setMode(mode, val, btn) {
    currentMode = mode;
    $('.dc-tool-btn, .dc-code-btn').removeClass('active');
    $(btn).addClass('active');

    if(mode === 'paint') {
        currentTool = val;
        currentText = '';
    } else {
        currentText = val;
    }
}

function handlePaint(e, wrap, box) {
    selectTooth(wrap);
    e.stopPropagation();
    const surf = e.target;
    
    if(currentMode === 'text') {
        box.value = currentText;
        return;
    }

    if(currentTool === 'missing') {
        wrap.classList.toggle('missing');
        return;
    }
    if(currentTool === 'clear') {
        wrap.classList.remove('missing');
        surf.className = `surface ${surf.classList[1]}`;
        return;
    }
    if(wrap.classList.contains('missing')) {
        alert("Cannot paint a missing tooth. Use Eraser to restore it first.");
        return;
    }
    surf.className = `surface ${surf.classList[1]} ${currentTool}`;
}

// --- SAVE LOGIC ---
function saveData() {
    const patientID = $('#buttons-group-deactivate').data('id');

    const teethData = [];
    document.querySelectorAll('.tooth-container').forEach(t => {
        const id = t.dataset.id;
        const txt = t.querySelector('.status-box').value;
        const note = t.dataset.note || "";
        const miss = t.classList.contains('missing');
        const conds = {};
        
        t.querySelectorAll('.surface').forEach(s => {
            if(s.classList.length > 2) conds[s.dataset.surf] = s.classList[2]; 
        });

        if(miss || txt || note || Object.keys(conds).length > 0) {
            teethData.push({ id, text: txt, note, missing: miss, surfaces: conds });
        }
    });

    const examData = {
        xray: {
            periapical: $('#xray-pa').is(':checked'),
            periapicalTooth: $('#xray-pa-th').val(),
            panoramic: $('#xray-pano').is(':checked'),
            cephalometric: $('#xray-ceph').is(':checked'),
            occlusal: $('#xray-occ').is(':checked'),
            others: $('#xray-other').val()
        },
        perio: {
            gingivitis: $('#perio-ging').is(':checked'),
            early: $('#perio-early').is(':checked'),
            moderate: $('#perio-mod').is(':checked'),
            advanced: $('#perio-adv').is(':checked')
        },
        occlusion: {
            class: $('#occ-class').val(),
            overjet: $('#occ-overjet').val(),
            overbite: $('#occ-overbite').val()
        },
        appliances: {
            ortho: $('#app-ortho').is(':checked'),
            stayplate: $('#app-stay').is(':checked')
        }
    };

    $.post('/save-dental-chart', {
        patientID: patientID,
        chartData: JSON.stringify(teethData),
        examData: JSON.stringify(examData)
    }, function(response) {
        alert("Dental Chart Saved Successfully!");
    }).fail(function() {
        alert("Error saving chart. Check console.");
    });
}

// Auto-init when file is loaded
document.addEventListener('DOMContentLoaded', initDentalChart);
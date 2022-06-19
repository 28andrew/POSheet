// Load stored data if it exists
var localData = localStorage.getItem("posheet_data");
var data = localData == null ? {} : JSON.parse(localData);

function saveData() {
    console.log('Saved:');
    console.log(data);
    localStorage.setItem("posheet_data", JSON.stringify(data));
}

// Initialize default data
var defaultData = {
    activeBill: 0,
    speeches: [[]],
    questions: [[]]
};
data = Object.assign({}, defaultData, data)

function getTotalBills() {
    return Math.max(data.speeches.length, (data.activeBill + 1));
}

// Active bill selection logic

var speechesHeadingTr = $("#speeches-heading");

function updateSpeechesHeading() {
    speechesHeadingTr.html("");
    for (var i = 0; i < getTotalBills(); i++) {
        var isActiveSpeech = i === data.activeBill;
        var heading = (isActiveSpeech ? "☆" : "") + (i + 1);
        var selectedClass = isActiveSpeech ? " class=\"selected-element\"" : "";
        speechesHeadingTr.append("<th" + selectedClass + " scope=\"col\">" + heading + "</th>");
    }
}

var leftSpeechButton = $("#left-speech-button");
var rightSpeechButton = $("#right-speech-button");

function handleSpeechButton(delta) {
    var currentBill = data.activeBill;
    currentBill += delta;
    currentBill = Math.max(0, currentBill);
    data.activeBill = currentBill;
    saveData();
    updateSpeechesHeading();
    // Update button states
    leftSpeechButton.prop('disabled', currentBill === 0);
}

leftSpeechButton.click(function() {
    handleSpeechButton(-1);
});
rightSpeechButton.click(function() {
    handleSpeechButton(1);
});

updateSpeechesHeading();
handleSpeechButton(0);

// Add speaker logic

var speakerInput = $("#speaker-input");
var sideSelectInput = $("#side-select");
var speakerAddButton = $("#speaker-add-button");

speakerAddButton.click(function() {
   handleSpeakerAddButton();
});

speakerInput.keypress(function(event) {
    // Detect enter in input
    if (event.keyCode === 13) handleSpeakerAddButton();
});

function handleSpeakerAddButton() {
    var speaker = speakerInput.val();
    // Ignore empty inputs
    if (!speaker || speaker.trim() === "") {
        return;
    }
    var side = sideSelectInput.val();
    var currentBill = data.activeBill;

    // Populate data.speeches if needed
    while (data.speeches.length < (currentBill + 1)) {
        data.speeches.push([]);
    }

    data.speeches[currentBill].push({
       'speaker': speaker,
       'side': side
    });

    // Flip AFF/NEG input
    sideSelectInput.val(side === 'aff' ? 'neg' : 'aff');

    speakerInput.val('');

    updateDisplayedSpeeches();
    saveData();
}

var speechesTableBody = $("#speeches-body");

function updateDisplayedSpeeches() {
    var billSpeechLengths = data.speeches.map(function(billSpeeches){
        return billSpeeches.length;
    });
    var maxLength = Math.max(...billSpeechLengths);
    speechesTableBody.html("");
    // Iterate as many times as the maximum amount of speeches on a bill
    for (var row = 0; row < maxLength; row++) {
        var rowHtml = "<tr>";
        for (var column = 0; column < getTotalBills(); column++) {
            var speechData = data.speeches[column][row];
            if (speechData) {
                var side = (speechData.side === 'aff') ? 'A' : 'N';
                rowHtml += "<td>" + speechData.speaker + " (" + side + ")</td>";
            } else {
                rowHtml += "<td></td>";
            }
        }
        rowHtml += "</tr>";
        speechesTableBody.append(rowHtml);
    }

    updateNextSpeakers();
}

/*
    Next speakers/questioners logic algorithm.
    Returns array of objects with properties "person" and "occurrences".
 */
function determineNext(previousPeopleArray, arrayElementToNameFunction) {
    /* Algorithm description:
    - Flatten entire array into 1d array
    - Count occurrences of each person
    - For each amount of occurrences, have an array of people (flip mapping to occurrences => people array)
    - Sort each array by order of appearance
     */

    // Flatten the array
    var flattenedArray = [];
    for (var i = 0; i < previousPeopleArray.length; i++) {
        for (var j = 0; j < previousPeopleArray[i].length; j++) {
            var element = previousPeopleArray[i][j];
            flattenedArray.push(arrayElementToNameFunction(element));
        }
    }

    // Count occurrences of each person
    var personToOccurrences = {}
    for (var person of flattenedArray) {
        if (!personToOccurrences.hasOwnProperty(person)) {
            personToOccurrences[person] = 1;
        } else {
            personToOccurrences[person]++;
        }
    }

    // Flip the mapping
    var occurrencesToPeople = {};
    for (var person in personToOccurrences) {
        if (personToOccurrences.hasOwnProperty(person)) {
            var occurrences = personToOccurrences[person];
            if (!occurrencesToPeople.hasOwnProperty(occurrences)) {
                occurrencesToPeople[occurrences] = [person];
            } else {
                occurrencesToPeople[occurrences].push(person);
            }
        }
    }

    // Sort each array for each amount of occurrences
    // Also create the objects that we'll finally return
    var peopleSorted = [];
    for (var occurrences in occurrencesToPeople) {
        if (occurrencesToPeople.hasOwnProperty(occurrences)) {
            var peopleArray = occurrencesToPeople[occurrences];
            for (var person of flattenedArray) {
                // Stop iterating once all people have been found & processed
                if (peopleArray.length === 0) {
                    break;
                }
                if (peopleArray.includes(person)) {
                    // Person found, so add them to sorted list & then remove from peopleArray
                    peopleSorted.push({
                        'person': person,
                        'occurrences': occurrences
                    });
                    peopleArray = peopleArray.filter(function(item) {
                        return item !== person;
                    })
                }
            }
        }
    }

    return peopleSorted;
}

var nextSpeakersElement = $("#next-speakers");

function updateNextSpeakers() {
    var nextSpeakers = determineNext(data.speeches, function(element) {
        return element.speaker;
    });

    nextSpeakersElement.html("");
    for (var nextSpeaker of nextSpeakers) {
        nextSpeakersElement.append("<li class=\"list-group-item\">" + nextSpeaker.person + " (" + nextSpeaker.occurrences + ")</li>");
    }

}

updateDisplayedSpeeches();
updateNextSpeakers();
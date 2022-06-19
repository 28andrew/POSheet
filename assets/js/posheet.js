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

function updateArrowsDisabledStates() {
    leftSpeechButton.prop('disabled', data.activeBill === 0);
    rightSpeechButton.prop('disabled',
        (data.activeBill > (data.speeches.length - 1) || data.speeches[data.activeBill].length === 0));
}

function handleSpeechButton(delta) {
    var currentBill = data.activeBill;
    currentBill += delta;
    currentBill = Math.max(0, currentBill);
    data.activeBill = currentBill;
    saveData();
    updateSpeechesHeading();
    updateArrowsDisabledStates();
}

leftSpeechButton.click(function() {
    handleSpeechButton(-1);
});
rightSpeechButton.click(function() {
    handleSpeechButton(1);
});

updateSpeechesHeading();
handleSpeechButton(0);

// Autocomplete with datalists

function updateList(datalistElement, list) {
    datalistElement.html("");
    for (var item of list) {
        datalistElement.append("<option value=\"" + item + "\">");
    }
}

function getUnique2d(array, transformElementFunction) {
    var uniquePeople = [];

    for (var peopleArray of array) {
        for (var person of peopleArray) {
            var transformed = transformElementFunction(person);
            if (!uniquePeople.includes(transformed)) {
                uniquePeople.push(transformed);
            }
        }
    }

    return uniquePeople;
}

function getAllPeople() {
    var uniqueSpeakers = getUnique2d(data.speeches, function(speech) {
        return speech.speaker;
    });
    var uniqueQuestioners = getUnique2d(data.questions, function(questioner) {
        return questioner;
    });
    var combined = uniqueSpeakers.concat(uniqueQuestioners);
    return combined.filter((item, pos) => combined.indexOf(item) === pos);
}

var speakersList = $("#speakers-list");
var questionersList = $("#questioners-list");
function updateAutoComplete() {
    var allPeople = getAllPeople();
    updateList(speakersList, allPeople);
    updateList(questionersList, allPeople);
}

updateAutoComplete();

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
    updateArrowsDisabledStates();
    updateAutoComplete();
    saveData();
}

// Set side select input depending on last speech
var lastSpeakerArr = data.speeches[data.speeches.length - 1];
var lastSpeaker = lastSpeakerArr[lastSpeakerArr.length - 1];
if (lastSpeaker) {
    sideSelectInput.val(lastSpeaker.side === 'aff' ? 'neg' : 'aff');
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
            // If invalid index, skip
            if (column > (data.speeches.length - 1)) {
                continue;
            }
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

// Add question logic
var questionInput = $("#question-input");
var questionAddButton = $("#question-button");

questionAddButton.click(function() {
    handleQuestionerAddButton();
});
questionInput.keypress(function(event) {
    // Detect enter in input
    if (event.keyCode === 13) handleQuestionerAddButton();
})

function handleQuestionerAddButton() {
    var questioner = questionInput.val();
    // Ignore empty inputs
    if (!questioner || questioner.trim() === "") {
        return;
    }

    // Figure out next question count/index
    var index = 0;
    for (var questionerArray of data.questions) {
        if (!questionerArray.includes(questioner)) {
            break;
        }
        index++;
    }

    // Populate data.questions
    while (data.questions.length < (index + 1)) {
        data.questions.push([]);
    }

    data.questions[index].push(questioner);

    questionInput.val('');

    updateDisplayedQuestioners();
    updateAutoComplete();
    saveData();
}

var questionsHeadingTr = $("#questions-heading");
var questionsTableBody = $("#questions-body");
function updateDisplayedQuestioners() {
    // Update table header
    questionsHeadingTr.html("");
    for (var i = 0; i < data.questions.length; i++) {
        questionsHeadingTr.append("<th scope=\"col\">" + (i + 1) + "</th>");
    }

    // Update table body
    var maxLength = Math.max(...(data.questions.map(function(questioners) {
        return questioners.length;
    })));
    questionsTableBody.html("");
    for (var row = 0; row < maxLength; row++) {
        var rowHtml = "<tr>";
        for (var column = 0; column < data.questions.length; column++) {
            var questioner = data.questions[column][row];
            rowHtml += "<td>" + (questioner ? questioner : '') + "</td>";
        }
        rowHtml += "</tr>";
        questionsTableBody.append(rowHtml);
    }

    updateNextQuestioners();
}

var nextQuestionersElement = $("#next-questioners");
function updateNextQuestioners() {
    var nextQuestioners = determineNext(data.questions, function (questioner) {
        return questioner;
    });

    nextQuestionersElement.html("");
    for (var nextQuestioner of nextQuestioners) {
        nextQuestionersElement.append("<li class=\"list-group-item\">" + nextQuestioner.person +
            " (" + nextQuestioner.occurrences + ")</li>")
    }
}

updateDisplayedQuestioners();
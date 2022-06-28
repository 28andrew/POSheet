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

var sideSelectInput = $("#side-select");

function handleSpeechButton(delta) {
    var currentBill = data.activeBill;
    currentBill += delta;
    currentBill = Math.max(0, currentBill);
    data.activeBill = currentBill;

    // Change side select to AFF if active bill has 0 speeches
    if (currentBill > (data.speeches.length - 1) || data.speeches[currentBill].length === 0) {
        sideSelectInput.val('aff');
    } else {
        // Change side select to opposite of last speech of new bill
        if (currentBill <= (data.speeches.length - 1)) {
            var speeches = data.speeches[currentBill];
            var lastSpeech = speeches[speeches.length - 1];
            sideSelectInput.val(lastSpeech.side === 'aff' ? 'neg' : 'aff');
        }
    }

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
var speakerAddButton = $("#speaker-add-button");

speakerAddButton.click(function() {
   handleSpeakerAddButton();
});

speakerInput.keypress(function(event) {
    // Detect enter in input
    if (event.keyCode === 13) handleSpeakerAddButton();
});

var statisticsText = $("#statistics-text");
function updateStatistics() {
    var speeches = 0;
    for (var speechArr of data.speeches) {
        speeches += speechArr.length;
    }
    var questions = 0;
    for (var questionArr of data.questions) {
        questions += questionArr.length;
    }

    var speechWord = "speech" + (speeches === 1 ? '' : 'es');
    var questionWord = "question" + (questions === 1 ? '' : 's');

    statisticsText.html(speeches + " " + speechWord + "<br> " + questions + " " + questionWord);
}

updateStatistics();

function handleChangedSpeeches() {
    updateDisplayedSpeeches();
    updateArrowsDisabledStates();
    updateAutoComplete();
    updateStatistics();
    saveData();
}

function capitalizeFirstLetterOnly(string) {
    if (string.length === 0) {
        return "";
    }
    if (string.length === 1) {
        return string.charAt(0).toUpperCase();
    }
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function handleSpeakerAddButton() {
    var speaker = speakerInput.val();
    // Ignore empty inputs
    if (!speaker || speaker.trim() === "") {
        return;
    }
    speaker = capitalizeFirstLetterOnly(speaker);

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

    handleChangedSpeeches();
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
                var flipButton = "<a class=\"action-button flip-button\" href=\"javascript:flipSpeech(" + column + "," + row + ");\">↻</a>";
                var closeButton = "<a class=\"action-button delete-button\" href=\"javascript:deleteSpeech(" + column + "," + row + ");\">&times;</a>";
                rowHtml += "<td>" + speechData.speaker + " (" + side + ") " + flipButton + closeButton + "</td>";
            } else {
                rowHtml += "<td></td>";
            }
        }
        rowHtml += "</tr>";
        speechesTableBody.append(rowHtml);
    }

    updateNextSpeakers();
}

function deleteSpeech(column, row) {
    if (confirm("Are you sure you would like to delete " + data.speeches[column][row].speaker + "'s speech?") === true) {
        data.speeches[column].splice(row, 1);
        handleChangedSpeeches();
    }
}

function flipSpeech(column, row) {
    var side = data.speeches[column][row].side;
    data.speeches[column][row].side = side === 'aff' ? 'neg' : 'aff';
    handleChangedSpeeches();
}

/*
    Next speakers/questioners algorithm.
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

function handleChangedQuestioners() {
    updateDisplayedQuestioners();
    updateAutoComplete();
    updateStatistics();
    saveData();
}

function handleQuestionerAddButton() {
    var questioner = questionInput.val();
    // Ignore empty inputs
    if (!questioner || questioner.trim() === "") {
        return;
    }
    questioner = capitalizeFirstLetterOnly(questioner);

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
    handleChangedQuestioners();
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
            var closeButton = "<a class=\"action-button delete-button\" href=\"javascript:deleteQuestioner(" + column + "," + row + ");\">&times;</a>";
            rowHtml += "<td>" + (questioner ? questioner + " " + closeButton : '') + "</td>";
        }
        rowHtml += "</tr>";
        questionsTableBody.append(rowHtml);
    }

    updateNextQuestioners();
}

function deleteQuestioner(column, row) {
    if (confirm("Are you sure you would like to delete " + data.questions[column][row] + "'s question?")) {
        data.questions[column].splice(row, 1);
        handleChangedQuestioners();
    }
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
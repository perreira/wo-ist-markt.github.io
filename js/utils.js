/*
 * © 2015-2016 Code for Karlsruhe and contributors.
 * See the file LICENSE for details.
 */

var DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
                 'Freitag', 'Samstag'];


/*
 * Return 0-padded string of a number.
 */
function pad(num, totalDigits) {
    var s = num.toString();
    while (s.length < totalDigits) {
        s = '0' + s;
    }
    return s;
}


/*
 * Returns true if opening range matches the day of the given date; otherwise
 * false.
 */
function openingRangeMatchesDay(openingRange, date) {
    var openFromDate = openingRange[0];
    var openTillDate = openingRange[1];
    var dayIndex = date.getDay();
    return (openFromDate.getDay() === dayIndex) &&
           (openTillDate.getDay() === dayIndex);
}


/*
 * Returns true if opening range contains the time of the given date; otherwise
 * false.
 */
function openingRangeContainsTime(openingRange, date) {
    var range = moment.range(openingRange[0], openingRange[1]);
    return range.contains(date);
}


/*
 * Returns opening ranges compiled via opening_hours.js.
 */
function getOpeningRanges(openingHoursStrings) {
    var monday = moment().startOf("week").add(1, 'days').toDate();
    var sunday = moment().endOf("week").add(1, 'days').toDate();
    var oh = new opening_hours(openingHoursStrings);
    return oh.getOpenIntervals(monday, sunday);
}


/*
 * Returns opening range for date or undefined.
 */
function getOpeningRangeForDate(openingRanges, date) {
    if (openingRanges !== undefined) {
        for (var index = 0; index < openingRanges.length; ++index) {
            var openingRange = openingRanges[index];
            var dayIsToday = openingRangeMatchesDay(openingRange, date);
            if (dayIsToday) {
                return openingRange;
            }
        }
    }
    return undefined;
}


/*
 * Returns the given string in camel case.
 */
function toCamelCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}


/*
 * Creates time-table HTML code.
 *
 * `openingRanges` is a list of ranges compiled via opening_hours.js. The first
 * and second element of each range item are the starting and closing dates.
 */
function getTimeTable(openingRanges) {
    var html = '<table class="times">';
    if (openingRanges !== undefined) {
        for (var index = 0; index < openingRanges.length; ++index) {
            var openingRange = openingRanges[index];
            var dayIsToday = openingRangeMatchesDay(openingRange, now);
            var tableRow = getTableRowForDay(openingRange, dayIsToday);
            html += tableRow;
        }
    }
    html += '</table>';
    return html;
}


/*
 * Returns table row for a day with opening hours.
 * If the day matches today the row is styled.
 */
function getTableRowForDay(openingRange, dayIsToday) {
    var openFromDate = openingRange[0];
    var openTillDate = openingRange[1];
    var dayNameIndex = openFromDate.getDay();
    var dayName = DAY_NAMES[dayNameIndex];
    var cls = dayIsToday ? ' class="today"' : '';
    var formattedOpenFrom = moment(openFromDate).format('HH:mm');
    var formattedOpenTill = moment(openTillDate).format('HH:mm');
    return '<tr' + cls + '><th>' + dayName + '</th>' + '<td>' +
           formattedOpenFrom + ' - ' + formattedOpenTill + ' Uhr</td></tr>';
}


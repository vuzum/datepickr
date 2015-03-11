/*
    datepickr 3.0 - pick your date not your nose

    https://github.com/joshsalverda/datepickr

    Copyright © 2014 Josh Salverda <josh.salverda@gmail.com>
    This program is free software. It comes without any warranty, to
    the extent permitted by applicable law. You can redistribute it
    and/or modify it under the terms of the Do What The Fuck You Want
    To Public License, Version 2, as published by Sam Hocevar. See
    http://www.wtfpl.net/ for more details.
*/

(function($){
'use strict';
/**
 * @constructor
 */
var datepickr = function (element, config) {
    var self = this;

    this.el = element;

    this.container = document.createElement('div'),
    this.navigation = document.createElement('span'),
    this.calendar = document.createElement('table'),
    this.calendarBody = document.createElement('tbody');

    this.container.className = 'datepickr-calendar';
    this.navigation.className = 'datepickr-current-month';
    config = config || {};

    this.documentClick = this.documentClick.bind(this);
    this.calendarClick = this.calendarClick.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);

    this.date = {
        current: {
            year: function () {
                return self.currentDate.getFullYear();
            },
            month: {
                integer: function () {
                    return self.currentDate.getMonth();
                },
                string: function (shorthand) {
                    var month = self.currentDate.getMonth();
                    return self.monthToStr(month, shorthand);
                }
            },
            day: function () {
                return self.currentDate.getDate();
            }
        },
        month: {
            string: function () {
                return self.monthToStr(self.currentMonthView, self.config.shorthandCurrentMonth);
            },
            numDays: function (month) {
                // checks to see if february is a leap year otherwise return the respective # of days
                var month = month || self.currentMonthView;
                return month === 1 && (((self.currentYearView % 4 === 0) && (self.currentYearView % 100 !== 0)) || (self.currentYearView % 400 === 0)) ? 29 : self.l10n.daysInMonth[month];
            }
        }
    }

    this.init();
};

datepickr.prototype = {
    config: {
        dateFormat: 'F j, Y',
        altFormat: null,
        altInput: null,
        minDate: null,
        maxDate: null,
        shorthandCurrentMonth: false
    },

    currentDate: new Date(),

    init: function (config) {
        var configOpt, parsedDate;

        for (configOpt in config) {
            this.config[configOpt] = config[configOpt];
        }

        if (this.el.value) {
            parsedDate = Date.parse(this.el.value);
        }

        if (parsedDate && !isNaN(parsedDate)) {
            parsedDate = new Date(parsedDate);
            this.selectedDate = {
                day: parsedDate.getDate(),
                month: parsedDate.getMonth(),
                year: parsedDate.getFullYear()
            };
            this.currentYearView = this.selectedDate.year;
            this.currentMonthView = this.selectedDate.month;
            this.currentDayView = this.selectedDate.day;
        } else {
            this.selectedDate = null;
            this.currentYearView = this.date.current.year();
            this.currentMonthView = this.date.current.month.integer();
            this.currentDayView = this.date.current.day();
        }

        this.wrap();
        this.buildCalendar();
        this.bind();
    },

    isSpecificDay: function (day, month, year, comparison) {
        return day === comparison && this.currentMonthView === month && this.currentYearView === year;
    },

    wrap: function () {
        this.$wrapperElement = $('<div class="datepickr-wrapper">')
            .appendTo(this.el.parentNode)
            .append(this.el);

        this.wrapperElement = this.$wrapperElement.get(0);
    },

    monthToStr: function (date, shorthand) {
        if (shorthand === true) {
            return this.l10n.months.shorthand[date];
        }

        return this.l10n.months.longhand[date];
    },

    formatDate: function (dateFormat, milliseconds) {
        var formattedDate = '',
            dateObj = new Date(milliseconds),
            self = this,
            formats = {
                d: function () {
                    var day = formats.j();
                    return (day < 10) ? '0' + day : day;
                },
                D: function () {
                    return self.l10n.weekdays.shorthand[formats.w()];
                },
                j: function () {
                    return dateObj.getDate();
                },
                l: function () {
                    return self.l10n.weekdays.longhand[formats.w()];
                },
                w: function () {
                    return dateObj.getDay();
                },
                F: function () {
                    return self.monthToStr(formats.n() - 1, false);
                },
                m: function () {
                    var month = formats.n();
                    return (month < 10) ? '0' + month : month;
                },
                M: function () {
                    return self.monthToStr(formats.n() - 1, true);
                },
                n: function () {
                    return dateObj.getMonth() + 1;
                },
                U: function () {
                    return dateObj.getTime() / 1000;
                },
                y: function () {
                    return String(formats.Y()).substring(2);
                },
                Y: function () {
                    return dateObj.getFullYear();
                }
            },
            formatPieces = dateFormat.split('');

        formatPieces.forEach(function (formatPiece, index) {
            if (formats[formatPiece] && formatPieces[index - 1] !== '\\') {
                formattedDate += formats[formatPiece]();
            } else {
                if (formatPiece !== '\\') {
                    formattedDate += formatPiece;
                }
            }
        });

        return formattedDate;
    },

    buildWeekdays: function () {
        var weekdayContainer = document.createElement('thead'),
            firstDayOfWeek = this.l10n.firstDayOfWeek,
            weekdays = this.l10n.weekdays.shorthand;

        if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
            weekdays = [].concat(weekdays.splice(firstDayOfWeek, weekdays.length), weekdays.splice(0, firstDayOfWeek));
        }

        weekdayContainer.innerHTML = '<tr><th>' + weekdays.join('</th><th>') + '</th></tr>';
        this.calendar.appendChild(weekdayContainer);
    },

    buildDays: function () {
        var firstOfMonth = new Date(this.currentYearView, this.currentMonthView, 1).getDay(),
            numDays = this.date.month.numDays(),
            calendarFragment = document.createDocumentFragment(),
            row = document.createElement('tr'),
            dayCount,
            dayNumber,
            today = '',
            selected = '',
            disabled = '',
            currentTimestamp;

        // Offset the first day by the specified amount
        firstOfMonth -= this.l10n.firstDayOfWeek;
        if (firstOfMonth < 0) {
            firstOfMonth += 7;
        }

        dayCount = firstOfMonth;
        this.calendarBody.innerHTML = '';

        // Add spacer to line up the first day of the month correctly
        if (firstOfMonth > 0) {
            var days = this.date.month.numDays(~this.currentMonthView-1?this.currentMonthView-1:11);
            for(var i = firstOfMonth-1; i >= 0; i--)
                row.innerHTML += '<td class="prev-month"><span class="datepickr-day" data-prev-month>'+(days-i)+'</span></td>';
        }

        // Start at 1 since there is no 0th day
        for (dayNumber = 1; dayNumber <= numDays; dayNumber++) {
            // if we have reached the end of a week, wrap to the next line
            if (dayCount === 7) {
                calendarFragment.appendChild(row);
                row = document.createElement('tr');
                dayCount = 0;
            }

            today = this.isSpecificDay(this.date.current.day(), this.date.current.month.integer(), this.date.current.year(), dayNumber) ? ' today' : '';
            if (this.selectedDate) {
                selected = this.isSpecificDay(this.selectedDate.day, this.selectedDate.month, this.selectedDate.year, dayNumber) ? ' selected' : '';
            }

            if (this.config.minDate || this.config.maxDate) {
                currentTimestamp = new Date(this.currentYearView, this.currentMonthView, dayNumber).getTime();
                disabled = '';

                if (this.config.minDate && currentTimestamp < this.config.minDate) {
                    disabled = ' disabled';
                }

                if (this.config.maxDate && currentTimestamp > this.config.maxDate) {
                    disabled = ' disabled';
                }
            }

            row.innerHTML += '<td class="' + today + selected + disabled + '"><span class="datepickr-day">' + dayNumber + '</span></td>';
            dayCount++;
        }

        if (dayCount < 7){
            for(var i = 1; i <= 7 - dayCount; i++)
                row.innerHTML += '<td class="next-month"><span class="datepickr-day" data-next-month>'+(i)+'</span></td>';
        }

        calendarFragment.appendChild(row);
        this.calendarBody.appendChild(calendarFragment);
    },

    updateNavigation: function () {
        this.navigation.innerHTML = this.date.month.string() + ' ' + this.currentYearView;
    },

    buildMonthNavigation: function () {
        var months = document.createElement('div'),
            monthNavigation;

        monthNavigation  = '<span class="datepickr-prev-month">&lt;</span>';
        monthNavigation += '<span class="datepickr-next-month">&gt;</span>';

        months.className = 'datepickr-months';
        months.innerHTML = monthNavigation;

        months.appendChild(this.navigation);
        this.updateNavigation();
        this.container.appendChild(months);
    },

    handleYearChange: function () {
        if (this.currentMonthView < 0) {
            this.currentYearView--;
            this.currentMonthView = 11;
        }

        if (this.currentMonthView > 11) {
            this.currentYearView++;
            this.currentMonthView = 0;
        }
    },

    documentClick: function (event) {
        var parent;
        if (event.target !== this.el && event.target !== this.wrapperElement) {
            parent = event.target.parentNode;
            if (parent !== this.wrapperElement) {
                while (parent !== this.wrapperElement) {
                    parent = parent.parentNode;
                    if (parent === null) {
                        this.close();
                        break;
                    }
                }
            }
        }
    },

    calendarClick: function (event) {
        var target = event.target,
            targetClass = target.className,
            currentTimestamp;

        if (targetClass) {
            if (targetClass === 'datepickr-prev-month' || targetClass === 'datepickr-next-month') {
                this.changeMonth(targetClass === 'datepickr-prev-month' ? this.currentMonthView-1 : this.currentMonthView+1);
            } else if (targetClass === 'datepickr-day' && !$(target.parentNode).hasClass('disabled')) {
                if(target.dataset.prevMonth != null || target.dataset.nextMonth != null)
                    this.changeMonth(target.dataset.prevMonth != null ? this.currentMonthView-1 : this.currentMonthView+1);

                this.selectedDate = {
                    day: parseInt(target.innerHTML, 10),
                    month: this.currentMonthView,
                    year: this.currentYearView
                };

                currentTimestamp = new Date(this.currentYearView, this.currentMonthView, this.selectedDate.day).getTime();

                if (this.config.altInput) {
                    if (this.config.altFormat) {
                        this.config.altInput.value = this.formatDate(this.config.altFormat, currentTimestamp);
                    } else {
                        // I don't know why someone would want to do this... but just in case?
                        this.config.altInput.value = this.formatDate(this.config.dateFormat, currentTimestamp);
                    }
                }

                this.el.value = this.formatDate(this.config.dateFormat, currentTimestamp);

                var change_event = new Event('change');
                this.el.dispatchEvent(change_event);

                this.close();
                this.buildDays();
            }
        }
    },

    changeMonth: function (month) {
        this.currentMonthView = month;

        this.handleYearChange();
        this.updateNavigation();
        this.buildDays();
    },

    buildCalendar: function () {
        this.buildMonthNavigation();
        this.buildWeekdays();
        this.buildDays();

        this.calendar.appendChild(this.calendarBody);
        this.container.appendChild(this.calendar);

        this.wrapperElement.appendChild(this.container);
    },

    getOpenEvent: function () {
        if (this.el.nodeName === 'INPUT') {
            return 'focus';
        }
        return 'click';
    },

    bind: function () {
        $(this.el).bind(this.getOpenEvent(), this.open);
        $(this.container).bind('click', this.calendarClick);
    },


    open: function () {
        $(document).bind('click', this.documentClick);
        this.$wrapperElement.addClass('open');
    },


    close: function () {
        $(document).unbind('click', this.documentClick, false);
        this.$wrapperElement.removeClass('open');
    },


    destroy: function () {
        var parent,
            element;

        $(document).unbind('click', this.documentClick, false);
        $(this.el).unbind(this.getOpenEvent(), open, false);

        parent = this.el.parentNode;
        parent.removeChild(this.container);
        element = parent.removeChild(this.el);
        parent.parentNode.replaceChild(element, parent);
    },

    refresh: function () {
        this.handleYearChange();
        this.updateNavigation();
        this.buildDays();
    },

    l10n: {
        weekdays: {
            shorthand: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            longhand: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        },
        months: {
            shorthand: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            longhand: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        firstDayOfWeek: 0
    }
};

$.datepickr = function (selector, config) {
    var elements,
        createInstance,
        instances = [],
        i;

    createInstance = function (element) {
        if (element._datepickr) {
            element._datepickr.destroy();
        }
        element._datepickr = new datepickr(element, config);
        instances.push(element._datepickr);
        return element._datepickr;
    };

    $(selector).toArray().forEach(createInstance);

    return instances;
};

$.fn.datepickr = function(){$.datepickr.apply(null, [this].concat(arguments));}

})(jQuery)
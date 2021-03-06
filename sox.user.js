// ==UserScript==
// @name         Stack Overflow Extras (SOX)
// @namespace    https://github.com/soscripted/sox
// @version      2.0.39
// @description  Extra optional features for Stack Overflow and Stack Exchange sites
// @contributor  ᴉʞuǝ (stackoverflow.com/users/1454538/)
// @contributor  ᔕᖺᘎᕊ (stackexchange.com/users/4337810/)
// @updateURL    https://rawgit.com/soscripted/sox/master/sox.user.js

// @match        *://*.stackoverflow.com/*
// @match        *://*.stackexchange.com/*
// @match        *://*.superuser.com/*
// @match        *://*.serverfault.com/*
// @match        *://*.askubuntu.com/*
// @match        *://*.stackapps.com/*
// @match        *://*.mathoverflow.net/*
// @match        *://github.com/soscripted/*
// @match        *://soscripted.github.io/sox/*

// @exclude      *://data.stackexchange.com/*
// @exclude      *://api.stackexchange.com/*

// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @require      https://code.jquery.com/ui/1.11.4/jquery-ui.min.js
// @require      https://api.stackexchange.com/js/2.0/all.js
// @require      https://cdn.rawgit.com/timdown/rangyinputs/master/rangyinputs-jquery-src.js
// @require      https://cdn.rawgit.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-timeago/1.5.3/jquery.timeago.min.js

// @require      sox.common.js
// @require      sox.github.js
// @require      sox.dialog.js
// @require      sox.features.js
// @require      sox.enhanced_editor.js

// @resource     css sox.css
// @resource     dialog sox.dialog.html
// @resource     featuresJSON sox.features.info.json?v=1
// @resource     common sox.common.info.json

// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_info
// ==/UserScript==
//jQuery.noConflict();
/*jshint loopfunc: true*/
(function(sox, $, undefined) {
    'use strict';

    function init() {
        if (sox.location.on('github.com/soscripted')) {
            try {
                sox.github.init(sox.info.version, sox.info.handler);
            } catch (e) {
                throw ('SOX: There was an error while attempting to initialize the sox.github.js file, please report this on GitHub.\n' + e);
            } finally {
                return;
            }
        }

        if (sox.location.on('soscripted.github.io/sox/#access_token')) { //save access token
            try {
                var access_token = window.location.href.split('=')[1].split('&')[0];
                sox.loginfo('SOX ACCESS TOKEN: ', access_token);
                GM_setValue('SOX-accessToken', access_token);
                alert('Access token successfully saved! You can close this window :)');
            } catch (e) {
                throw ('SOX: There was an error saving your access token');
            } finally {
                return;
            }
        }

        if (sox.info.debugging) {
            sox.debug('DEBUGGING SOX VERSION ' + sox.info.version);
            sox.debug('----------------saved variables---------------------');
            sox.settings.writeToConsole(true); //true => hide access token
            sox.debug('----------------end saved variables---------------------');
        }

        GM_addStyle(GM_getResourceText('css'));
        $('<link/>', {
            rel: 'stylesheet',
            href: 'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'
        }).appendTo('head');

        var settings = sox.settings.load(), //returns undefined if not set
            featureInfo = JSON.parse(GM_getResourceText('featuresJSON'));

        try {
            sox.dialog.init({
                version: sox.info.version,
                features: featureInfo,
                settings: settings
            });
        } catch (e) {
            throw ('SOX: There was an error while attempting to initialize the SOX Settings Dialog, please report this on GitHub.\n' + e);
        }

        if (sox.settings.available) {
            // execute features
            for (var i = 0; i < settings.length; ++i) {
                var category = settings[i].split('-')[0],
                    featureId = settings[i].split('-')[1];

                if (!(category in featureInfo.categories)) { //if we ever rename a category
                    sox.loginfo('Deleting feature "' + settings[i] + '" (category rename?)');
                    settings.splice(i, 1);
                    sox.settings.save(settings);
                    continue;
                }

                var feature = featureInfo.categories[category].filter(function(obj) {
                        return obj.name == featureId;
                    })[0],
                    runFeature = true,
                    sites,
                    pattern;

                try {
                    //NOTE: there is no else if() because it is possible to have both match and exclude patterns..
                    //which could have minor exceptions making it neccessary to check both
                    if (feature.match !== '') {
                        sites = feature.match.split(',');

                        for (pattern = 0; pattern < sites.length; pattern++) {
                            if (!sox.location.matchWithPattern(sites[pattern])) {
                                runFeature = false; //none of the patterns match the current site.. yet.
                            } else {
                                runFeature = true;
                                break; //if it does match, then stop looping; we want the feature to run
                            }
                        }
                    }
                    if (feature.exclude !== '') {
                        sites = feature.exclude.split(',');

                        for (pattern = 0; pattern < sites.length; pattern++) {
                            if (sox.location.matchWithPattern(sites[pattern])) { //if current site is in list, DON'T run feature
                                runFeature = false; //don't run feature
                                break; //no need to keep on looping
                            }
                        }
                    }
                    if (runFeature) {
                        sox.debug('running ' + featureId);
                        if (feature.settings) {
                            var settingsToPass = GM_getValue("SOX-" + featureId + "-settings") ? JSON.parse(GM_getValue("SOX-" + featureId + "-settings")) : {};
                            sox.features[featureId](settingsToPass); //run the feature if match and exclude conditions are met, pass on settings object
                        } else {
                            sox.features[featureId](); //run the feature if match and exclude conditions are met
                        }
                    }
                } catch (err) {
                    if (!sox.features[featureId] || !feature) { //remove deprecated/'corrupt' feature IDs from saved settings
                        sox.loginfo('Deleting feature "' + settings[i] + '" (feature not found)');
                        settings.splice(i, 1);
                        sox.settings.save(settings);
                        $('#sox-settings-dialog-features').find('#' + settings[i].split('-')[1]).parent().parent().remove();
                    } else {
                        $('#sox-settings-dialog-features').find('#' + settings[i].split('-')[1]).parent().css('color', 'red').attr('title', 'There was an error loading this feature. Please raise an issue on GitHub.');
                        sox.error('There was an error loading the feature "' + settings[i] + '". Please raise an issue on GitHub, and copy the following error log:\n' + err);
                    }
                }
            }
        }


        //custom events....
        sox.helpers.observe('.new_comment', function() { //custom event that triggers when a new comment appears/show more comments clicked; avoids lots of the same mutationobserver
            $(document).trigger('sox-new-comment');
            sox.debug('sox-new-comment event triggered');
        });

        sox.helpers.observe('li[id^="wmd-redo-button"], textarea[id^="wmd-input"]', function(target) {
            $(document).trigger('sox-edit-window', [target]);
            sox.debug('sox-edit-window event triggered');
        });

        sox.helpers.observe('.reviewable-post, .review-content', function(target) {
            $(document).trigger('sox-new-review-post-appeared', [target]);
            sox.debug('sox-new-review-post-appeared event triggered');
        });

        if (GM_getValue('SOX-accessToken', -1) == -1) { //set access token
            //This was originally a series of IIFEs appended to the head which used the SE API JS SDK but
            //it was very uncertain and often caused issues, especially in FF
            //it now uses a Github page to show the access token
            //and detects that page and saves it automatically.
            //this seems to be a much cleaner and easier-to-debug method!

            window.open('https://stackexchange.com/oauth/dialog?client_id=7138&scope=no_expiry&redirect_uri=http://soscripted.github.io/sox/');
            alert('To complete the SOX installation please follow the instructions in the window that has been opened for you to receive your access token');
            sox.warn('Please go to the following URL to get your access token for certain SOX features', 'https://stackexchange.com/oauth/dialog?client_id=7138&scope=no_expiry&redirect_uri=http://soscripted.github.io/sox/');
        }
    }
    sox.ready(init);
})(window.sox = window.sox || {}, jQuery);

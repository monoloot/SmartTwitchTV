/*
 * Copyright (c) 2017-2020 Felipe de Leon <fglfgl27@gmail.com>
 *
 * This file is part of SmartTwitchTV <https://github.com/fgl27/SmartTwitchTV>
 *
 * SmartTwitchTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmartTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartTwitchTV.  If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//Variable initialization
var PlayClip_isOn = false;
var PlayClip_quality = 'source';
var PlayClip_qualityPlaying = PlayClip_quality;
var PlayClip_qualityIndex = 0;
var PlayClip_qualities = [];
var PlayClip_playingUrl = '';
var PlayClip_replayOrNext = false;
var PlayClip_replay = false;
var PlayClip_state = 0;
var PlayClip_HasVOD = false;
var PlayClip_Buffer = 2000;

var PlayClip_jumpTimers = [1];

var PlayClip_HasNext = false;
var PlayClip_HasBack = false;
var PlayClip_HideShowNextDiv;
var PlayClip_EnterPos = 0;
var PlayClip_All = false;
//Variable initialization end

var PlayClip_BaseUrl = 'https://gql.twitch.tv/gql';
var PlayClip_postMessage = '{"query":"{clip(slug: \\"%x\\") {videoQualities {frameRate quality sourceURL}}}"}';

function PlayClip_Start() {
    //Main_Log('PlayClip_Start');

    Play_showBufferDialog();
    Play_HideEndDialog();

    PlayClip_HasVOD = Main_values.ChannelVod_vodId !== null;
    Chat_title = STR_CLIP;
    PlayVod_ProgresBarrUpdateNoAnimation(0, 1, true);

    Play_BottonIcons_Next_img.src = IMG_404_BANNER;
    Play_BottonIcons_Back_img.src = IMG_404_BANNER;
    Play_BottonIcons_End_img.src = IMG_404_BANNER;
    Main_ShowElementWithEle(Play_BottonIcons_Next_img);
    Main_ShowElementWithEle(Play_BottonIcons_Back_img);
    Main_ShowElementWithEle(Play_BottonIcons_End_img);

    Play_LoadLogo(Main_getElementById('stream_info_icon'), IMG_404_BANNER);
    Main_innerHTML(
        "stream_info_name",
        Play_partnerIcon(
            Main_values.Main_selectedChannelDisplayname,
            false,
            2,
            ChannelClip_language
        )
    );

    Main_innerHTML("stream_info_title", ChannelClip_title);
    Main_innerHTML("stream_info_game", ChannelClip_game);

    Main_innerHTMLWithEle(Play_infoLiveTime, ChannelClip_createdAt + ',' + STR_SPACE + ChannelClip_views);
    Main_textContent("stream_live_viewers", '');
    Main_textContentWithEle(Play_infoWatchingTime, '');

    Main_textContentWithEle(Play_BottonIcons_Progress_Duration, Play_timeS(Play_DurationSeconds));
    PlayClip_SetProgressBarJumpers();

    Main_replaceClassEmoji('stream_info_title');
    Play_LoadLogo(Main_getElementById('stream_info_icon'), Main_values.Main_selectedChannelLogo);

    Main_values.Play_isHost = false;

    Play_StartStayShowBottom();
    Play_SetControlsVisibility('ShowInClip');
    PlayClip_SetOpenVod();

    Play_BottonIconsResetFocus();

    Play_CurrentSpeed = 3;
    Play_BufferSize = 0;
    PlayVod_previews_clear();
    Main_empty('inner_progress_bar_muted');

    Main_textContentWithEle(Play_BottonIcons_Progress_CurrentTime, Play_timeS(0));

    Main_innerHTMLWithEle(Play_BottonIcons_Pause, '<div ><i class="pause_button3d icon-pause"></i> </div>');
    Main_ShowElementWithEle(Play_Controls_Holder);

    PlayClip_state = Play_STATE_LOADING_TOKEN;
    UserLiveFeed_PreventHide = false;
    PlayClip_UpdateNext();
    Play_HasLive = false;
    Play_EndSet(3);
    UserLiveFeed_Unset();
    Play_IsWarning = false;

    PlayClip_isOn = true;

    if (!Play_PreviewId) {

        if (!PlayClip_replay) PlayClip_loadDataRequest();//Play_PlayEndStart(3);
        else PlayClip_qualityChanged();

    } else {

        PlayClip_QualityStart(Play_PreviewResponseText);
        Play_CheckIfIsLiveCleanEnd();

    }

    if (PlayClip_HasVOD) {
        Chat_offset = ChannelVod_vodOffset;
        Chat_Init();
    } else Chat_NoVod();

    PlayClip_replay = false;

    PlayClip_GetStreamerInfo();
    if (PlayClip_HasVOD) {

        PlayClip_updateVodInfo();

    } else {

        Main_textContent("end_vod_name_text", '');
        Main_innerHTML("end_vod_title_text", '');

        Play_controls[Play_controlsOpenVod].setLable('');
    }

    Play_CheckFollow(Main_values.Main_selectedChannel_id);
    Play_ShowPanelStatus(3);
    Play_controls[Play_controlsChanelCont].setLable(Main_values.Main_selectedChannelDisplayname);
    Play_controls[Play_controlsGameCont].setLable(Play_data.data[3]);

    PlayClip_CheckIsLive(Main_values.Main_selectedChannel_id);
}

function PlayClip_SetProgressBarJumpers() {

    PlayVod_jumpStepsIncreaseLock = false;
    Play_DefaultjumpTimers = PlayClip_jumpTimers;
    PlayVod_jump_max_step = 0;
    PlayVod_jumpSteps(Play_DefaultjumpTimers[0]);

}


function PlayClip_updateVodInfo() {
    if (!Main_values.ChannelVod_vodId) return;

    var theUrl = Main_kraken_api + 'videos/' + Main_values.ChannelVod_vodId + Main_TwithcV5Flag_I;
    BasexmlHttpGet(
        theUrl,
        2,
        null,
        PlayClip_updateVodInfoSuccess,
        noop_fun
    );
}

function PlayClip_updateVodInfoSuccess(response) {
    ChannelVod_title = Main_ReplaceLargeFont(twemoji.parse(JSON.parse(response).title, false, false));
    Main_innerHTML("end_vod_title_text", ChannelVod_title);
    Play_controls[Play_controlsOpenVod].setLable(ChannelVod_title, Main_values.Main_selectedChannelDisplayname);
}

function PlayClip_GetStreamerInfo() {
    //Main_Log('PlayClip_GetStreamerInfo');
    var theUrl = Main_kraken_api + 'channels/' + Main_values.Main_selectedChannel_id + Main_TwithcV5Flag_I;

    BasexmlHttpGet(
        theUrl,
        2,
        null,
        PlayClip_GetStreamerInfoSuccess,
        noop_fun
    );
}

function PlayClip_GetStreamerInfoSuccess(response) {
    Main_values.Main_selectedChannelPartner = JSON.parse(response).partner;
    Main_innerHTML(
        "stream_info_name",
        Play_partnerIcon(
            Main_values.Main_selectedChannelDisplayname,
            Main_values.Main_selectedChannelPartner,
            2,
            ChannelClip_language
        )
    );
}

var PlayClip_loadDataRequestId;
function PlayClip_loadDataRequest() {

    PlayClip_loadDataRequestId = (new Date().getTime());

    FullxmlHttpGet(
        PlayClip_BaseUrl,
        Play_base_backup_headers_Array,
        PlayClip_loadDataResult,
        noop_fun,
        0,
        PlayClip_loadDataRequestId,
        'POST',//Method, null for get
        PlayClip_postMessage.replace('%x', ChannelClip_playUrl)//postMessage, null for get
    );
}

function PlayClip_loadDataResult(responseObj, key, id) {
    if (PlayClip_isOn && PlayClip_loadDataRequestId === id) {

        if (responseObj.status === 200) {

            var tempArray = PlayClip_QualityGenerate(responseObj.responseText);

            if (tempArray.length) {
                PlayClip_QualityStart(tempArray);
                return;
            }

        }

        PlayClip_loadDataError();

    }

}

function PlayClip_loadDataError() {
    Play_HideBufferDialog();

    Play_showWarningDialog(STR_410_ERROR, 2000);

    Main_setTimeout(
        function() {
            Play_PlayEndStart(3);
        },
        2000
    );
}

function PlayClip_QualityGenerate(mresponse) {
    var Array = [],
        response = JSON.parse(mresponse);

    if (response && response.hasOwnProperty('data') && response.data.hasOwnProperty('clip') && response.data.clip) {
        response = response.data.clip.videoQualities;

        var i = 0, len = response.length;
        for (i; i < len; i++) {

            if (!Array.length) {
                Array.push({
                    'id': response[i].quality + 'p' + PlayClip_FrameRate(response[i].frameRate) + ' | source | mp4',
                    'url': response[i].sourceURL
                });
            } else {
                Array.push({
                    'id': response[i].quality + 'p' + PlayClip_FrameRate(response[i].frameRate) + ' | mp4',
                    'url': response[i].sourceURL
                });
            }
        }
    }

    return Array;
}

function PlayClip_QualityStart(qualities) {
    PlayClip_qualities = qualities;

    Play_SetExternalQualities(PlayClip_qualities, 0);
    PlayClip_state = Play_STATE_PLAYING;
    PlayClip_qualityChanged();
    PlayClip_qualityReset();
    Main_Set_history('clip', Main_values_Play_data);
}

function PlayClip_FrameRate(value) {
    if (value > 40) return 60;
    else return '';
}

function PlayClip_SetQuality(array) {
    var len = array.length,
        i = 0,
        ret = 0;

    if (Settings_DisableQualitiesLen) {

        //Find a not blocked resolution
        for (i; i < len; i++) {

            if (!PlayClip_CheckBlockedRes(i, array)) {
                ret = i;
                break;
            }
        }

    } else {

        if (!Main_A_includes_B(PlayClip_quality, 'ource')) {
            for (i; i < len; i++) {

                if (array[i].id === PlayClip_quality) {
                    ret = i;
                    break;
                }
            }
        }

    }

    return ret;
}

function PlayClip_CheckBlockedRes(pos, array) {

    for (var i = 0; i < Settings_DisableQualitiesLen; i++) {

        if (Main_startsWith(array[pos].id, Settings_DisableQualities[i]))
            return true;

    }

    return false;
}

function PlayClip_qualityChanged() {
    PlayClip_qualityIndex = PlayClip_SetQuality(PlayClip_qualities);
    PlayClip_playingUrl = PlayClip_qualities[PlayClip_qualityIndex].url;

    PlayClip_state = Play_STATE_PLAYING;

    PlayClip_quality = PlayClip_qualities[PlayClip_qualityIndex].id;
    PlayClip_qualityPlaying = PlayClip_quality;
    PlayClip_SetHtmlQuality(Play_info_quality);
    PlayClip_onPlayer();
    //Play_PannelEndStart(3);
}


function PlayClip_onPlayer() {
    //Main_Log('PlayClip_onPlayer ' + PlayClip_playingUrl);

    if (Main_IsOn_OSInterface && PlayClip_isOn) {
        OSInterface_StartAuto(
            PlayClip_playingUrl,
            '',
            3,
            PlayClip_replayOrNext ? -1 : OSInterface_gettime(),
            0
        );
    }

    PlayClip_replayOrNext = false;

    if (Play_ChatEnable && !Play_isChatShown()) Play_showChat();
    Play_SetFullScreen(Play_isFullScreen);
}

function PlayClip_Resume() {
    //return;
    Main_clearInterval(Play_ShowPanelStatusId);
    PlayClip_shutdownStream();
}

function PlayClip_shutdownStream() {
    //Main_Log('PlayClip_shutdownStream ' + PlayClip_isOn);

    if (PlayClip_isOn) {
        PlayClip_All = false;
        PlayClip_PreshutdownStream(true);
        Play_CleanHideExit();
        Play_exitMain();
        PlayClip_loadDataRequestId = 0;
    }
}

function PlayClip_PreshutdownStream(closePlayer) {
    //Main_Log('PlayClip_PreshutdownStream ' + closePlayer);
    PlayClip_UpdateHistory(Main_values.Main_Go);

    PlayClip_hidePanel();

    if (Main_IsOn_OSInterface && !Play_PreviewId) {

        if (closePlayer) OSInterface_stopVideo();
        else OSInterface_PlayPause(false);

    }

    if (closePlayer) PlayClip_isOn = false;
    Chat_Clear();
    Play_ClearPlayer();

    if (!Play_PreviewId) UserLiveFeed_Hide();
    else UserLiveFeed_HideAfter();

    PlayClip_qualities = [];
    Main_removeEventListener("keydown", PlayClip_handleKeyDown);
    ChannelVod_vodOffset = 0;
}

function PlayClip_UpdateHistory(screen) {

    var time = Main_IsOn_OSInterface ? (parseInt(OSInterface_gettime() / 1000)) : 10;

    if (time > 0) {

        Main_history_UpdateVodClip(ChannelClip_Id, time, 'clip');

        if (!ScreenObj[Main_HistoryClip].histPosX[1] && ScreenObj[screen].screenType === 2) {

            var data = ScreenObj[screen].DataObj[ScreenObj[screen].posY + '_' + ScreenObj[screen].posX];

            if (data && ChannelClip_Id === data[7]) {

                Main_getElementById(ScreenObj[screen].ids[7] + (ScreenObj[screen].posY + '_' + ScreenObj[screen].posX)).style.width = ((time / data[1]) * 100) + '%';

            }

        }
    }

}

function PlayClip_UpdateNext() {
    var nextid = PlayClip_getIdNext(1, 0);
    var backid = PlayClip_getIdNext(-1, ScreenObj[Main_values.Main_Go].ColoumnsCount - 1);
    var data;

    PlayClip_HasNext = false;
    PlayClip_HasBack = false;

    if (nextid) {

        PlayClip_HasNext = true;
        data = Main_Slice(ScreenObj[Main_values.Main_Go].DataObj[nextid]);

        PlayClip_NextImg(Play_BottonIcons_Next_img, data[15]);
        Main_innerHTMLWithEle(Play_BottonIcons_Next_name, Main_ReplaceLargeFont(data[4]));
        Main_innerHTMLWithEle(Play_BottonIcons_Next_title, Main_ReplaceLargeFont(data[10]));

        PlayClip_NextImg(Play_BottonIcons_End_img, data[15]);
        Main_innerHTMLWithEle(Play_BottonIcons_End_name, Main_ReplaceLargeFont(data[4]));
        Main_innerHTMLWithEle(Play_BottonIcons_End_title, Main_ReplaceLargeFont(data[10]));

        PlayClip_HideShowNext(0, 1);

    } else {

        PlayClip_HideShowNext(0, 0);
        Main_HideElementWithEle(Play_BottonIcons_End_img);

    }

    if (backid) {

        PlayClip_HasBack = true;
        data = Main_Slice(ScreenObj[Main_values.Main_Go].DataObj[backid]);

        PlayClip_NextImg(Play_BottonIcons_Back_img, data[15]);
        Main_innerHTMLWithEle(Play_BottonIcons_Back_name, Main_ReplaceLargeFont(data[4]));
        Main_innerHTMLWithEle(Play_BottonIcons_Back_title, Main_ReplaceLargeFont(data[10]));
        PlayClip_HideShowNext(1, 1);

    } else PlayClip_HideShowNext(1, 0);
}

function PlayClip_NextImg(ImgObjet, link) {
    ImgObjet.onerror = function() {
        this.onerror = null;
        this.src = IMG_404_BANNER;
        Main_HideElementWithEle(this);
    };
    ImgObjet.src = link;
}

function PlayClip_getIdNext(y, x) {

    if (ScreenObj[Main_values.Main_Go].DataObj[ScreenObj[Main_values.Main_Go].posY + '_' + (ScreenObj[Main_values.Main_Go].posX + y)]) {

        return ScreenObj[Main_values.Main_Go].posY + '_' + (ScreenObj[Main_values.Main_Go].posX + y);

    } else if (ScreenObj[Main_values.Main_Go].DataObj[(ScreenObj[Main_values.Main_Go].posY + y) + '_' + x]) {

        return (ScreenObj[Main_values.Main_Go].posY + y) + '_' + x;

    }

    return null;
}

function PlayClip_HideShowNext(which, val) {
    PlayClip_HideShowNextDiv[which].style.opacity = val;
}

function PlayClip_Enter() {
    if (!PlayClip_EnterPos) {
        if (Main_IsOn_OSInterface && !Play_isEndDialogVisible()) OSInterface_PlayPauseChange();
    } else if (PlayClip_EnterPos === 1) PlayClip_PlayNext();
    else if (PlayClip_EnterPos === -1) PlayClip_PlayPreviously();
}

function PlayClip_PlayNext() {
    PlayClip_PreshutdownStream(false);

    Screens_KeyLeftRight(1, 0, Main_values.Main_Go);
    PlayClip_PlayNextPreviously();
}

function PlayClip_PlayPreviously() {
    PlayClip_PreshutdownStream(false);

    Screens_KeyLeftRight(-1, ScreenObj[Main_values.Main_Go].ColoumnsCount - 1, Main_values.Main_Go);
    PlayClip_PlayNextPreviously();
}

function PlayClip_PlayNextPreviously() {
    Play_ForceHidePannel();
    Main_ready(function() {
        PlayClip_replayOrNext = true;
        Main_OpenClip(
            Screens_GetObj(Main_values.Main_Go),
            ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX,
            ScreenObj[Main_values.Main_Go].ids,
            ScreenObj[Main_values.Main_Go].key_fun,
            ScreenObj[Main_values.Main_Go].ScreenName
        );
    });
}

function PlayClip_hidePanel() {
    //return;//return;
    Play_ForceHidePannel();

    //Reset values
    Play_ResetSpeed();
    PlayClip_qualityReset();
    Play_controls[Play_controlsBack].enterKey(3, true);
    Play_BottonIconsResetFocus(true);

    Play_clearHidePanel();
    PlayVod_ClearProgressJumptime(0);

}

function PlayClip_qualityReset() {
    PlayClip_quality = PlayClip_qualityPlaying;

    PlayClip_qualityIndexReset();

    Play_qualityDisplay(
        PlayClip_getQualitiesCount,
        PlayClip_qualityIndex,
        PlayClip_SetHtmlQuality,
        Play_controls[Play_controlsQuality]
    );
}

function PlayClip_showPanel() {

    PlayVod_RefreshProgressBarrStart(false, 2);
    Play_CleanHideExit();
    Play_ForceShowPannel();
    Play_clearHidePanel();
    PlayClip_setHidePanel();
}

function PlayClip_qualityIndexReset() {
    PlayClip_qualityIndex = 0;
    var i = 0, len = PlayClip_getQualitiesCount();

    for (i; i < len; i++) {
        if (PlayClip_qualities[i].id === PlayClip_quality) {
            PlayClip_qualityIndex = i;
            break;
        } else if (Main_A_includes_B(PlayClip_qualities[i].id, PlayClip_quality)) { //make shore to set a value before break out
            PlayClip_qualityIndex = i;
        }
    }

    if (PlayClip_qualities[PlayClip_qualityIndex]) Play_qualityTitleReset(PlayClip_qualities[PlayClip_qualityIndex].id.split(' | mp4')[0]);
}

function PlayClip_getQualitiesCount() {
    return PlayClip_qualities.length;
}

function PlayClip_SetHtmlQuality(element) {
    if (!PlayClip_qualities.length || !PlayClip_qualities[PlayClip_qualityIndex].hasOwnProperty('id')) return;

    PlayClip_quality = PlayClip_qualities[PlayClip_qualityIndex].id;

    var quality_string = PlayClip_quality;
    if (Main_A_includes_B(PlayClip_quality, 'source')) quality_string = quality_string.replace("source", STR_SOURCE);

    Main_textContentWithEle(element, PlayClip_quality);
}

function PlayClip_setHidePanel() {
    Play_PanelHideID = Main_setTimeout(PlayClip_hidePanel, (5000 + PlayVod_ProgressBaroffset), Play_PanelHideID); // time in ms
}

function PlayClip_SetOpenVod() {
    if (PlayClip_HasVOD) Play_BottomShow(Play_controlsOpenVod);
    else Play_BottomHide(Play_controlsOpenVod);
}

var PlayClip_OpenAVod = false;
function PlayClip_OpenVod() {
    if (PlayClip_HasVOD) {
        Play_DurationSeconds = 0;
        Main_vodOffset = ChannelVod_vodOffset;
        PlayClip_PreshutdownStream(true);
        Main_addEventListener("keydown", PlayVod_handleKeyDown);
        PlayClip_OpenAVod = true;
        PlayVod_Start();
    } else {
        Play_clearHidePanel();
        Play_IsWarning = true;
        Play_showWarningDialog(STR_NO_BROADCAST_WARNING, 2000);
    }
}

//When update this check PlayVod_CheckIfIsLiveResult
function PlayClip_CheckIfIsLiveResult(response) {

    Play_CheckIfIsLiveResultEnd(response, PlayClip_isOn, PlayClip_OpenLiveStream);

}

function PlayClip_CheckIfIsLiveStart() {

    if (!Main_IsOn_OSInterface || Play_PreviewId) PlayClip_OpenLiveStream();
    else Play_CheckIfIsLiveStart('PlayClip_CheckIfIsLiveResult');

}

function PlayClip_OpenLiveStream() {
    PlayClip_PreshutdownStream(true);
    Play_OpenFeed(PlayClip_handleKeyDown);
}

function PlayClip_CheckPreview() {

    if (PlayClip_isOn && !Play_isEndDialogVisible() && Main_values.Main_Go !== Main_ChannelContent &&
        Settings_Obj_default('show_clip_player') && ScreenObj[Main_values.Main_Go].screenType === 2 && !Sidepannel_isShowingUserLive() &&
        !Main_ThumbOpenIsNull(ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX, ScreenObj[Main_values.Main_Go].ids[0])) {

        if (PlayClip_CheckPreviewClip()) {
            Play_PreviewURL = PlayClip_qualities[0].url;
            Play_PreviewResponseText = PlayClip_qualities;
            Play_PreviewId = ChannelClip_playUrl;
        }
    }

}

function PlayClip_CheckPreviewClip() {
    var restorePreview = false;

    var data = ScreenObj[Main_values.Main_Go].DataObj[ScreenObj[Main_values.Main_Go].posY + '_' + ScreenObj[Main_values.Main_Go].posX];

    if (data) {

        restorePreview = Main_A_equals_B(data[0], ChannelClip_playUrl);

    }

    //The content may have refreshed so re-check
    if (Play_PreviewVideoEnded) Play_PreviewVideoEnded = restorePreview;

    return restorePreview;
}

function PlayClip_handleKeyDown(e) {
    if (PlayClip_state !== Play_STATE_PLAYING) {
        switch (e.keyCode) {
            case KEY_STOP:
                Play_CleanHideExit();
                PlayClip_shutdownStream();
                break;
            case KEY_KEYBOARD_BACKSPACE:
            case KEY_RETURN:
                if (Play_ExitDialogVisible() || Settings_Obj_default("single_click_exit")) {
                    Play_CleanHideExit();
                    PlayClip_shutdownStream();
                } else {
                    Play_showExitDialog();
                }
                break;
            default:
                break;
        }
    } else {
        switch (e.keyCode) {
            case KEY_LEFT:
                if (Play_isPanelShowing()) {
                    if (PlayVod_PanelY === 2) Play_BottomLeftRigt(3, -1);
                    else if (!PlayVod_PanelY) {
                        PlayVod_jumpStart(-1, Play_DurationSeconds);
                        PlayVod_ProgressBaroffset = 2500;
                    } else if (PlayVod_PanelY === 1) {
                        if (PlayClip_EnterPos > -1) {
                            PlayClip_EnterPos--;
                            if (PlayClip_HasBack || !PlayClip_EnterPos) Play_BottonIconsFocus();
                            else PlayClip_EnterPos++;
                        }
                    }
                    Play_clearHidePanel();
                    PlayClip_setHidePanel();
                } else if (UserLiveFeed_isPreviewShowing() && (!Play_EndFocus || !Play_isEndDialogVisible())) {
                    UserLiveFeed_KeyRightLeft(-1);
                } else if (Play_isEndDialogVisible()) {

                    Play_EndTextClear();
                    Play_EndIconsRemoveFocus();
                    Play_Endcounter--;

                    if (!Play_HasLive && Play_Endcounter === 1) Play_Endcounter--;

                    if (Play_Endcounter < (PlayClip_HasNext ? -1 : 0)) Play_Endcounter = 4;

                    Play_EndIconsAddFocus();

                } else PlayClip_FastBackForward(-1);
                break;
            case KEY_RIGHT:
                if (Play_isPanelShowing()) {
                    if (PlayVod_PanelY === 2) Play_BottomLeftRigt(3, 1);
                    else if (!PlayVod_PanelY) {
                        PlayVod_jumpStart(1, Play_DurationSeconds);
                        PlayVod_ProgressBaroffset = 2500;
                    } else if (PlayVod_PanelY === 1) {
                        if (PlayClip_EnterPos < 1) {
                            PlayClip_EnterPos++;
                            if (PlayClip_HasNext || !PlayClip_EnterPos) Play_BottonIconsFocus();
                            else PlayClip_EnterPos--;
                        }
                    }
                    Play_clearHidePanel();
                    PlayClip_setHidePanel();
                } else if (UserLiveFeed_isPreviewShowing() && (!Play_EndFocus || !Play_isEndDialogVisible())) {
                    UserLiveFeed_KeyRightLeft(1);
                } else if (Play_isEndDialogVisible()) {

                    Play_EndTextClear();
                    Play_EndIconsRemoveFocus();
                    Play_Endcounter++;

                    if (!Play_HasLive && Play_Endcounter === 1) Play_Endcounter++;

                    if (Play_Endcounter > 4) Play_Endcounter = PlayClip_HasNext ? -1 : 0;

                    Play_EndIconsAddFocus();

                } else PlayClip_FastBackForward(1);
                break;
            case KEY_UP:
                if (Play_isPanelShowing()) {

                    Play_clearHidePanel();
                    if (PlayVod_PanelY < 2) {
                        PlayVod_PanelY--;
                        Play_BottonIconsFocus();
                    } else Play_BottomUpDown(3, 1);
                    PlayClip_setHidePanel();

                } else if (Play_isEndDialogVisible() || UserLiveFeed_isPreviewShowing()) {
                    Play_EndTextClear();
                    Main_removeEventListener("keydown", PlayClip_handleKeyDown);
                    Main_addEventListener("keyup", Play_handleKeyUp);
                    Play_EndUpclear = false;
                    Play_EndUpclearCalback = PlayClip_handleKeyDown;
                    Play_EndUpclearID = Main_setTimeout(Play_keyUpEnd, Screens_KeyUptimeout, Play_EndUpclearID);
                } else if (!UserLiveFeed_isPreviewShowing()) UserLiveFeed_ShowFeed();
                else PlayClip_showPanel();
                break;
            case KEY_DOWN:
                if (Play_isPanelShowing()) {
                    Play_clearHidePanel();
                    if (PlayVod_PanelY < 2) {
                        PlayVod_PanelY++;
                        Play_BottonIconsFocus(false, true);
                    } else Play_BottomUpDown(3, -1);
                    PlayClip_setHidePanel();
                } else if (Play_isEndDialogVisible()) {
                    Play_EndDialogUpDown(1);
                } else if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_KeyUpDown(1);
                else if (Play_isFullScreen && !Play_isPanelShowing()) Play_controls[Play_controlsChat].enterKey(3);
                else PlayClip_showPanel();
                break;
            case KEY_ENTER:
                if (Play_isEndDialogVisible()) {
                    if (Play_EndFocus) Play_EndDialogPressed(3);
                    else {
                        if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                        else {
                            Play_EndDialogEnter = 3;
                            Play_EndUpclearCalback = PlayClip_handleKeyDown;
                            Play_SavePlayData();
                            PlayClip_CheckIfIsLiveStart();
                        }
                    }
                } else if (Play_isPanelShowing()) {
                    Play_clearHidePanel();
                    if (!PlayVod_PanelY) {
                        if (PlayVod_IsJumping) PlayVod_jump();
                    } else if (PlayVod_PanelY === 1) PlayClip_Enter();
                    else Play_BottomOptionsPressed(3);
                    PlayClip_setHidePanel();
                } else if (UserLiveFeed_isPreviewShowing()) {
                    if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                    else PlayClip_CheckIfIsLiveStart();
                }
                else PlayClip_showPanel();
                break;
            case KEY_STOP:
                PlayClip_CheckPreview();
                Play_CleanHideExit();
                PlayClip_shutdownStream();
                break;
            case KEY_KEYBOARD_BACKSPACE:
            case KEY_RETURN:
                if (Play_isEndDialogVisible() && !Play_ExitDialogVisible()) {
                    Play_EndTextClear();

                    if (!Play_EndFocus) {
                        if (UserLiveFeed_FeedPosX === UserLiveFeedobj_UserAGamesPos ||
                            UserLiveFeed_FeedPosX === UserLiveFeedobj_AGamesPos) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                        else {
                            Play_EndFocus = true;
                            UserLiveFeed_FeedRemoveFocus(UserLiveFeed_FeedPosX);
                            Play_EndIconsAddFocus();
                        }
                    } else {
                        UserLiveFeed_FeedRemoveFocus(UserLiveFeed_FeedPosX);
                        Play_EndIconsAddFocus();
                        Play_showExitDialog();
                    }

                } else if (Play_isPanelShowing()) PlayClip_hidePanel();
                else if (UserLiveFeed_isPreviewShowing() && !Play_isEndDialogVisible()) {
                    if (UserLiveFeed_FeedPosX === UserLiveFeedobj_UserAGamesPos ||
                        UserLiveFeed_FeedPosX === UserLiveFeedobj_AGamesPos) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                    else UserLiveFeed_Hide();
                } else {
                    if (Play_ExitDialogVisible() || Settings_Obj_default("single_click_exit")) {
                        PlayClip_CheckPreview();
                        Play_CleanHideExit();
                        PlayClip_shutdownStream();
                    } else {
                        Play_showExitDialog();
                    }
                }
                break;
            case KEY_PLAY:
            case KEY_PLAYPAUSE:
            case KEY_KEYBOARD_SPACE:
                if (Main_IsOn_OSInterface && !Play_isEndDialogVisible()) OSInterface_PlayPauseChange();
                break;
            case KEY_1:
                if (UserLiveFeed_isPreviewShowing()) {
                    if (UserLiveFeed_obj[UserLiveFeed_FeedPosX].IsGame) UserLiveFeed_KeyEnter(UserLiveFeed_FeedPosX);
                    else PlayClip_CheckIfIsLiveStart();
                }
                break;
            case KEY_REFRESH:
                if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_FeedRefresh();
                else if (!Play_isEndDialogVisible() && !Play_isPanelShowing() &&
                    !Play_MultiDialogVisible()) Play_controls[Play_controlsChatSide].enterKey(3);
                break;
            case KEY_CHAT:
                Play_controls[Play_controlsChat].enterKey(3);
                break;
            case KEY_MEDIA_REWIND:
            case KEY_PG_UP:
                if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_KeyUpDown(-1);
                else if (Play_isFullScreen && Play_isChatShown()) Play_KeyChatPosChage();
                else UserLiveFeed_ShowFeed();
                break;
            case KEY_PG_DOWN:
                if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_KeyUpDown(1);
                else if (Play_isFullScreen && Play_isChatShown()) Play_KeyChatSizeChage();
                else UserLiveFeed_ShowFeed();
                break;
            case KEY_MEDIA_FAST_FORWARD:
                if (Play_isEndDialogVisible()) break;

                if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_FeedRefresh();
                else Play_controls[Play_controlsChatSide].enterKey(3);
                break;
            case KEY_MEDIA_NEXT:
                PlayClip_PlayNext();
                break;
            case KEY_MEDIA_PREVIOUS:
                PlayClip_PlayPreviously();
                break;
            default:
                break;
        }
    }
}

function PlayClip_FastBackForward(position) {
    if (!Play_isPanelShowing()) PlayClip_showPanel();
    Play_clearHidePanel();
    PlayVod_PanelY = 0;
    Play_BottonIconsFocus();

    PlayVod_jumpStart(position, Play_DurationSeconds);
    PlayVod_ProgressBaroffset = 2500;
    PlayClip_setHidePanel();
}

var PlayClip_CheckIsLiveId;
var PlayClip_CheckIsLiveTimeoutId;

function PlayClip_CheckIsLive(id, SetInterval, SkipHide) {

    if (!id) return;

    if (!SkipHide) PlayClip_SetOpenLiveError();

    if (SetInterval) {

        PlayClip_CheckIsLiveTimeoutId = Main_setTimeout(
            function() {

                PlayClip_CheckIsLive(id, SetInterval, true);

            },
            3 * 60 * 1000,
            PlayClip_CheckIsLiveTimeoutId
        );

    } else {

        Main_clearTimeout(PlayClip_CheckIsLiveTimeoutId);

    }

    PlayClip_CheckIsLiveId = (new Date().getTime());

    var theUrl = Main_kraken_api + 'streams/?stream_type=all&channel=' + id + Main_TwithcV5Flag;

    BasexmlHttpGet(
        theUrl,
        2,
        null,
        PlayClip_SetOpenLive,
        PlayClip_SetOpenLiveError,
        0,
        PlayClip_CheckIsLiveId
    );
}

var PlayClip_SetOpenLiveData;
function PlayClip_SetOpenLive(response, key, ID) {

    if (ID !== PlayClip_CheckIsLiveId) return;

    var obj = JSON.parse(response);

    if (obj.streams && obj.streams.length) {

        var tempData = ScreensObj_LiveCellArray(obj.streams[0]),
            playing = (tempData[3] !== STR_IS_LIVE ? STR_PLAYING + tempData[3] + ', ' : "") + tempData[4];

        Play_controls[Play_controlsOpenLive].setLable(
            playing,
            tempData[1]
        );

        Play_BottomShow(Play_controlsOpenLive);

        PlayClip_SetOpenLiveData = tempData;

        if (!Play_HasLive && Settings_value.live_warn.defaultValue === 1) {

            Play_showWarningMidleDialog(
                tempData[1] + STR_BR + Play_controls[Play_controlsOpenLive].string,
                3000,
                true
            );

        }

        Play_HasLive = true;
        Play_EndSet(PlayClip_isOn ? 3 : 2);

    } else PlayClip_SetOpenLiveError();

    PlayClip_CheckIsLiveId = 0;

}

function PlayClip_SetOpenLiveError() {
    Play_HasLive = false;
    Play_BottomHide(Play_controlsOpenLive);

    if (Play_Panelcounter === Play_controlsOpenLive) {

        Play_IconsResetFocus();
        Play_BottonIconsResetFocus(true);

    }

    if (Play_isEndDialogVisible()) {

        Play_EndTextsSetHasLive();

    }
}


function Play_ClipCheckIfIsLive(id) {

    Play_showBufferDialog();

    if (!Main_IsOn_OSInterface) {

        PlayClip_ClipCheckIfIsLiveOpen();

    } else {

        Play_PreviewCheckId = (new Date().getTime());

        OSInterface_getStreamDataAsync(
            PlayClip_BaseUrl,
            Play_live_links.replace('%x', id),
            'Play_ClipCheckIfIsLiveEnd',
            Play_PreviewCheckId,
            2,//Main player runs on 0 extra player on 1 the check on 2
            DefaultHttpGetTimeout,
            false,
            Play_live_token.replace('%x', id)
        );

    }
}

function Play_ClipCheckIfIsLiveEnd(response) {

    if ((PlayClip_isOn || PlayVod_isOn) && response) {

        var responseObj = JSON.parse(response);

        if (responseObj.checkResult > 0 && responseObj.checkResult === Play_PreviewCheckId) {

            var error = PlayClip_SetOpenLiveData[6] + STR_SPACE;

            Play_CheckIfIsLiveResultCheck(
                response,
                responseObj,
                error,
                false,
                PlayClip_ClipCheckIfIsLiveOpen,
                PlayClip_SetOpenLiveError
            );

        }

    }

}

var PlayClip_DontSkipStartAuto;
function PlayClip_ClipCheckIfIsLiveOpen() {
    var keyfun;

    Main_values_Play_data = PlayClip_SetOpenLiveData;
    Play_data.data = Main_values_Play_data;
    Play_PreviewId = Play_data.data[14];
    PlayClip_DontSkipStartAuto = true;

    if (PlayClip_isOn) {

        PlayClip_PreshutdownStream(true);
        keyfun = PlayClip_handleKeyDown;

    } else {

        PlayVod_PreshutdownStream(true);
        keyfun = PlayVod_handleKeyDown;

    }

    Main_removeEventListener("keydown", keyfun);
    Main_openStream();

    Main_EventPlay(
        'live',
        Main_values_Play_data[6],
        Main_values_Play_data[3],
        Main_values_Play_data[15],
        screen
    );

}

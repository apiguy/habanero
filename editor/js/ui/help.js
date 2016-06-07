/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

RED.help = (function() {

    function showHabaneroHelp(topic) {
        if (!topic.dialog) {
            topic.dialog = $('<div id="habanero-help-dialog" class="hide">'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:100%; padding: 10px;">'+
                    '<div class="wistia_embed '+topic.embedcode+'" style="height:432px;width:768px">&nbsp;</div>'+
                '</div>'+
                '</div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: "830",
                title:"Help - "+topic.label,
                resizable: false,
                open: function() {
                    RED.keyboard.disable();
                },
                close: function() {
                    RED.keyboard.enable();
                }
            });
        }
        
        topic.dialog.dialog("open");
    }

    function init(options) {
        options = options || {};

        var menuOptions = [];

        if(RED.settings.helpTopics.length == 0){
            return;
        }

        $.each(RED.settings.helpTopics, function(i,helpTopic) {
            var menuOption = {
                id:helpTopic.id,
                icon:helpTopic.img,
                label:helpTopic.label,
                sublabel:helpTopic.sublabel,
                selected:false,
                onselect:function(s) { 
                    if(this.selected){
                        showHabaneroHelp(helpTopic);
                    }else{
                        this.selected = true;
                    }
                }
            }
            menuOptions.push(menuOption);
        });

        $('<li><span class="help-button-group button-group">'+
          '<a id="btn-help" class="help-button" data-toggle="dropdown" href="#"><span>Help</a>'+
          '</span></li>').prependTo(".header-toolbar");
          RED.menu.init({id:"btn-help", options: menuOptions });
    }

    return {
        init: init
    }
})();

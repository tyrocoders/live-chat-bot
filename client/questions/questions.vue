<style>
div [class*="pull left"] {
  float: left;
  margin-left: 0.25em;
}
div [class*="pull right"] {
  float: right;
   margin-right: 0.25em;
}
.flexbox {
    display: flex;
    flex: 1;
    margin-right:0.5em;
}
.color-picker input[type="color"] {
    height: 40px;
    width: 70px;
    vertical-align: middle;
}
</style>
 
<template lang="html">
    <div class="ui container left aligned">

          <sui-grid 
            style="padding-top:5%;"
            divided="vertically"
            v-for="question in questions">
            <sui-grid-row 
                :columns="1">
                <sui-grid-column>
                    <h2 class="pull left" style="display:inline;vertical-align:middle">
                        Question {{questions.indexOf(question)+1}}
                    </h2>
                    <sui-button
                        class="pull right"
                        color="red"
                        icon="trash"
                        @click="deleteQuestion(question)" />
                    <sui-button
                        class="pull right"
                        color="grey"
                        icon="arrow down"
                        @click="moveQuestionDown(question)" />
                    <sui-button
                        class="pull right"
                        color="grey"
                        icon="arrow up"
                        @click="moveQuestionUp(question)" />
                </sui-grid-column>
            </sui-grid-row>

            <sui-grid-row style="padding:0px">
                <sui-grid-column>
                    <sui-list relaxed>
                        <sui-list-item>
                            <sui-list-content>
                                <sui-label
                                    pointing="right"
                                    color="teal"
                                    style="vertical-align:middle">Type</sui-label>
                                <sui-dropdown
                                    selection
                                    placeholder="Question Type"
                                    :options="questionTypes"
                                    @input="checkForChanges()"
                                    v-model="question.type" />
                                <sui-label
                                    pointing="right"
                                    color="teal"
                                    style="vertical-align:middle; margin-left: 10px;">Prompt</sui-label>
                                <sui-input
                                    :style="$mq | mq({
                                        smallScreen: 'width:50%',
                                        bigScreen: 'width:70%'})"
                                    v-model="question.prompt"
                                    :value="question.prompt"
                                    @input="checkForChanges()"/>
                            </sui-list-content>
                        </sui-list-item>
                    </sui-list>
                </sui-grid-column>
            </sui-grid-row>
            <sui-grid-row v-if="question.type!=='Free Response'">
                <sui-grid-column>
                    <sui-grid 
                        v-for="response in question.responses">
                        <sui-grid-row :columns="1">
                            <sui-grid-column>
                                <sui-label
                                    pointing="right"
                                    color="teal"
                                    style="vertical-align:middle">Choice</sui-label>
                                <sui-input
                                    :style="$mq | mq({
                                            smallScreen: 'width:40%',
                                            bigScreen: 'width:30%'})"
                                    class="flexbox"
                                    v-model="response.text"
                                    :value="response.text"
                                    @input="checkForChanges()"/>                          
                                <sui-label
                                    pointing="right"
                                    color="teal"
                                    style="vertical-align:middle; margin-left: 10px;">Action</sui-label>
                                <sui-dropdown      
                                    selection
                                    :options="questionActions"
                                    v-model="response.action"
                                    @input="updateAction(response)"/>
                                <sui-icon
                                    name="arrow right"
                                    size="large" />
                                <span v-if="response.action==='Forward to Question'">
                                    <sui-dropdown   
                                        selection
                                        placeholder="Question"
                                        :options="questionsForDropdown"
                                        v-model="response.actionOption"
                                        @input="checkForChanges()"/>
                                </span>
                                <span v-if="response.action==='Forward to Tag'">
                                    <sui-input   
                                        placeholder="tag"
                                        :value="response.actionOption"
                                        v-model="response.actionOption"
                                        @input="updateTagData(response)"/>
                                </span>                                
                                <sui-input
                                    type="color"
                                    class="color-picker"
                                    :value="response.color"
                                    v-model="response.color"
                                    @input="checkForChanges()"/>  
                                <sui-button 
                                    color="red"
                                    icon="trash alternate outline"
                                    style="vertical-align:middle"
                                    @click="deleteResponse(question, response)" />
                                <p v-if="response.invalidTag" style="color: #ff0000;">
                                    The tag "{{response.actionOption}}" does not exist in your organization.
                                </p>
                            </sui-grid-column>
                        </sui-grid-row>
                    </sui-grid>
                <sui-button
                    style="margin-top:25px"
                    color="green"
                    content="Add Choice"
                    @click="newResponse(question)"
                    v-if="question.type==='Multiple Choice'"/>
                </sui-grid-column>
            </sui-grid-row>
            
             <sui-grid-row
                class="left aligned"
                v-if="question.type==='Free Response'">
                <sui-grid-column>
                    <sui-list divided relaxed>
                        <sui-list-item>
                            <sui-list-content style="color:#777">                          
                                <sui-label
                                    pointing="right"
                                    color="teal"
                                    style="vertical-align:middle">Action</sui-label>
                                <sui-dropdown      
                                    selection
                                    :options="questionActions"
                                    v-model="question.responses[0].action"
                                    @input="updateAction(question.responses[0].action)"/>
                                <sui-icon
                                    name="arrow right"
                                    size="large" />
                                <span v-if="question.responses[0].action==='Forward to Question'">
                                    <sui-dropdown   
                                        selection
                                        placeholder="Question"
                                        :options="questionsForDropdown"
                                        v-model="question.responses[0].actionOption"
                                        @input="checkForChanges()"/>
                                </span>
                                <span v-if="question.responses[0].action==='Forward to Tag'">
                                    <sui-input   
                                        placeholder="tag"
                                        :value="question.responses[0].actionOption"
                                        v-model="question.responses[0].actionOption"
                                        @input="updateTagData(question.responses[0])"/>
                                </span>
                            </sui-list-content>
                        </sui-list-item>
                    </sui-list>
                </sui-grid-column>
            </sui-grid-row>
        </sui-grid>

        <div style="margin-bottom:100px">
            <sui-divider />
            <sui-button
                class="ui large green button pull left"
                content="New Question"
                @click="newQuestion()" />

            <sui-button
                class="ui large blue button pull right"
                content="Save Changes" 
                @click="saveData()"
                v-if="changesMade" />
        </div>
        

        <div>
            <sui-modal v-model="showingSaveChangesModal">
                <sui-modal-header>Save Changes</sui-modal-header>
                <sui-modal-content>
                    <sui-modal-description>
                        <sui-header>Continue without saving changes?</sui-header>
                        <p>Your changes have not been saved.</p>
                    </sui-modal-description>
                </sui-modal-content>
                <sui-modal-actions style="padding:10px">
                    <sui-button 
                        class="yellow" 
                        floated="left"
                        @click="showingSaveChangesModal = false"
                        content="Cancel" />
                    <sui-button 
                        class="red"
                        @click="nextRoute()"
                        content="Don't Save & Continue" />
                    <sui-button 
                        floated="right" 
                        class="green" 
                        @click="saveAndContinue()"
                        content="Save & Continue" />
                </sui-modal-actions>
            </sui-modal>
        </div>

    </div>
</template>
 
<script>
'use strict'
module.exports = {
    mounted: function() {
        this.loadData();
    },
    methods: {
        checkForChanges(){
            if(this.changesMade) return;
            if(JSON.stringify(this.questions) !== this.questionsOriginal){
                this.changesMade = true;
            }
        },
        deleteResponse: function(question, response) {
            question.responses.splice(question.responses.indexOf(response),1);
            this.changesMade = true;
        },
        deleteQuestion: function(question) {
            this.questions.splice(this.questions.indexOf(question), 1);
            this.questionsForDropdown.splice(this.questions.indexOf(question), 1);
            this.changesMade = true;
        },
        loadData: function(){
            util.fetch.call(this, '/api/questions/', {method: 'get'})
            .then(result => {
                this.questionsOriginal = JSON.stringify(result.theJson);
                this.questions = result.theJson;
                this.questionsForDropdown = [];
                for(let i=0; i<this.questions.length; i++){
                    this.questionsForDropdown.push({
                        text: `Question ${i+1}`,
                        value: `Question ${i+1}`
                    });
                }
            });

            util.fetch.call(this, '/api/tags/', {method: 'get'})
            .then(result => {
                this.tags = result.theJson.tags;
            });
        },
        moveQuestionDown: function(question) {
            const i = this.questions.indexOf(question);
            if(i >= this.questions.length - 1) return;            
            const temp = this.questions[i+1];
            this.questions.splice(i+1, 1, question);
            this.questions.splice(i, 1, temp);
            this.checkForChanges();
        },
        moveQuestionUp: function(question) {
            const i = this.questions.indexOf(question);
            if(i <= 0) return;
            const temp = this.questions[i-1];
            this.questions.splice(i-1, 1, question);
            this.questions.splice(i, 1, temp);
            this.checkForChanges();

        },
        newQuestion: function () {
            this.questions.push({
                prompt: "Question Prompt",
                type: "Multiple Choice",
                responses: [
                    {
                        text: "Yes",
                        action: 'Forward to Question',
                        actionOption: "Question 1",
                        tagId: null,
                        color: '#B9D3EE'
                    },
                    {
                        text: "No",
                        action: 'Forward to Question',
                        actionOption: "Question 1",
                        tagId: null,
                        color: '#F08080'
                    }
                ]
            });
            this.questionsForDropdown.push({
                text: `Question ${this.questions.length}`,
                value: `Question ${this.questions.length}`
            });
            this.changesMade = true;
        },
        newResponse: function (question){
            question.responses.push({
                text: "New Response",
                action: "Forward to Question",
                actionOption: `Question ${this.questions.indexOf(question)+1}`,
                distId: null,
                color: '#00ff00'
            });
            this.changesMade = true;
        },
        saveAndContinue: function() {
            this.saveData();
            this.nextRoute();
        },
        saveData: function() {
            util.fetch('/api/questions/', {
                method:'post',
                body: { questions: this.questions }
            });
            this.changesMade = false;
            this.questionsOriginal = JSON.stringify(this.questions);
        },
        updateAction: function(response) {
            response.actionOption = '';
            if(response.action === 'Forward to Question') {
                response.actionOption = 'Question 1';
            }
            this.checkForChanges();
        },
        updateTagData: function(response) {
            const tag = this.tags.find(t => t.slug === response.actionOption)
            response.invalidTag = !tag;
            if(!response.invalidTag) {
                response.tagId = tag.id;
            }
            this.checkForChanges();
        }
    },
    beforeRouteLeave: function(to, from, next){
        if(this.changesMade){
            this.showingSaveChangesModal = true;
            this.nextRoute = next;
            next(false);
        }else{
            next();
        }
    },
    data: function() {
        return {
            global: shared.state,
            changesMade: false,
            questions: [],
            questionsOriginal: [],
            questionsForDropdown: [],
            showingSaveChangesModal: false,
            nextRoute: null,
            tags: [],
            questionActions: [
                {
                    text: "Forward to Question",
                    value: "Forward to Question"
                },
                {
                    text: "Forward to Tag",
                    value: "Forward to Tag"
                },
            ],
            questionTypes: [
                {
                    text: "Free Response",
                    value: "Free Response"
                },
                {
                    text: "Multiple Choice",
                    value: "Multiple Choice"
                }
            ]
        }
    }
}
</script>
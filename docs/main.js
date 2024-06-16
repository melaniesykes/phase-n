// Get query string parameters
let urlParams = new URLSearchParams(window.location.search);
let game = urlParams.get("game");
let id = urlParams.get("id");
let round_over = false;
let game_over = false;
let has_phase = false;
let current_player = null;
let has_drawn = false;
let submit_button = `<button onmousedown="completePhase()" style="font-size:14;margin-top:5px;">COMPLETE PHASE</button>`;

let player_hand;
const completed_players = new Set();

function labeledPile(pile_id, pile_name) {
    let div_html = `<div id=div${pile_id} class=phase-pile onmousedown="selectPile('${pile_id.slice(3)}')">`;
    if (pile_name) {
        div_html += `<h5 class=pile-name>${pile_name}</h5>`;
    }
    div_html += `<div id=${pile_id} class=pile-cards-div></div></div>`;
    return div_html
}

$.get(`${SERVERURL}player_data?game=${game}&id=${id}`,
    function(data) {
        player_hand = data[id]['hand'];
    
        for (let [player_id, player_info] of Object.entries(data)) {

            let player_select = `onmousedown="selectPlayer('${player_id}')"`;
            let public_pile_grid = '';
            
            for (let [pile_id, pile_name] of Object.entries(player_info['piles'])){
                public_pile_grid += labeledPile('pub' + pile_id, pile_name);
            }

            let hand = labeledPile('pub' + player_info['hand'], '');               

            let player_div;
            if (player_id == id) {
                player_div = `
                <div id=${player_id} class=player-info>
                    <h2>${player_info['name']}</h2>
                    <div id=turn${player_id} class=turn></div>
                </div>
                `;
            } else {
                player_div = `
                <div id=${player_id} class=player-info>
                    <h2 ${player_select}>${player_info['name']}</h2>
                    <div id=turn${player_id} class=turn></div>
                    <div id=pubpiles${player_id} class=pile-grid>${public_pile_grid}</div>
                    <div id=pubhand${player_id} class=pile-grid>${hand}</div>
                </div>
                `;
            }
            $("#standings").append(player_div);
        }
        let private_pile_grid = '';
        for (let [pile_id, pile_name] of Object.entries(data[id]['piles'])){
            private_pile_grid += labeledPile('pri' + pile_id, pile_name);
        }
        $('#phase-grid').html(private_pile_grid);
        $(`<div id=pri${player_hand} style="text-align:center"class=box></div>`).insertAfter('#phase-grid');
        $(`#pri${player_hand}`).attr('onmousedown', `selectPile("${data[id]['hand']}")`);

    }
)

// Get updates on data
let dataInterval;

jQuery.fn.insertIndex = function(index, element) {
    var lastIndex = this.children().length
    if (index < 0) {
      index = Math.max(0, lastIndex + 1 + index);
    }
    this.append(element);
    if (index < lastIndex) {
      this.children().eq(index).before(this.children().last());
    }
    return this;
}

function getData(){
    $.get(`${SERVERURL}data?game=${game}&id=${id}`,
        function(data){
            if (data == "error: game not found"){
                /*
                This means that either the game has ended
                and is in the lobby, or the game code is incorrect.
                Either way we just ignore the message instead of erasing all
                current data.
                */
                console.log("error: game not found");
            }
            else{
                for (let update of JSON.parse(data)) {
                    let update_type = update['action'];
                    if (update_type == 'game over') {
                        round_over = true;
                        game_over = true;

                    } else if (update_type == 'round over') {
                        $('.turn').html('');
                        let reason = update['reason'];
                        $("#win-display").css("display","block");
                        $("#winner-name").html(reason);
                        // Stop the update interval
                        clearInterval(dataInterval);
                        round_over = true;
                        // setInterval(checkIfReturn,1000);

                    } else if (update_type == 'complete phase') {
                        let player_id = update['player'];
                        let hand_id = update['hand'];

                        if (player_id == id) {
                            $(`#turn${current_player}`).html('discarding a card...');
                            has_phase = null;
                        }

                        completed_players.add(player_id)
                        let n_cards = Math.max($(`#pri${hand_id}`).children().length - 1, 0);
                        $(`#${player_id}`).insertIndex(1, `<h2 id=ncards${hand_id}>(${n_cards})</h2>`)

                    } else if (update_type == 'show pile') {
                        let pile = update['pile'];
                        let cards = update['cards'];

                        let pile_cards = '';

                        for (let public_image of JSON.parse(cards)) {
                            pile_cards += `
                            <div class=pile-card-div >
                                <img class=pile-card src=assets/${public_image}.png>
                            </div>
                            `
                        }

                        $(`#pub${pile}`).html(pile_cards)
                        
                    } else if (update_type == 'has phase') {
                        let player_id = update['player'];

                        if (player_id == id) {
                            has_phase = true;
                            if ((current_player == id) && has_drawn) {
                                $(`#turn${current_player}`).html(submit_button);
                            }
                        }

                    } else if (update_type == 'unhas phase') {
                        let player_id = update['player'];
                        
                        if (player_id == id) {
                            has_phase = false;
                            if ((current_player == id) && has_drawn) {
                                $(`#turn${current_player}`).html('discarding a card...');
                            }
                        }

                    } else if (update_type == 'complete pile') {
                        let pile = update['pile'];
                        $(`#divpri${pile}`).css('background-color', 'rgb(68 194 59)');
                        
                    } else if (update_type == 'uncomplete pile') {
                        let pile = update['pile'];
                        $(`#divpri${pile}`).css('background-color', '');
                        
                    } else if (update_type == 'turn') {
                        let player_id = update['player'];
                        current_player = player_id;

                        $('.player-info').css('background-color', '').css('border', '');
                        $(`#${player_id}`).css('background-color', '#f7913e').css('border', '4px solid black');
                        $(`#turn${player_id}`).html('drawing a card...');

                    } else if (update_type == 'select card') {
                        if (update['player'] == id) {
                            let pile = update['pile'];
                            let card_index = update['card_index'];
                            // solid rgb(236, 232, 27) 3px

                            $('.hand-card').find('img').css('border', '');
                            $('.pile-card').css('border', '');
                            $(`#pri${pile}`).children().eq(card_index).find('img').css('border', '3px solid rgb(236, 232, 27)');
                        }

                    } else if (update_type == 'unselect card') {
                        if (update['player'] == id) {
                            $('.hand-card').find('img').css('border', '');
                            $('.pile-card').css('border', '');
                        }

                    } else if (update_type == 'select pile') {
                        if (update['player'] == id) {
                            let pile = update['pile'];
                            $('.phase-pile').css('border', '4px solid black');
                            $(`#pri${player_hand}`).css('border', '4px solid black');
                            if (pile == player_hand) {
                                $(`#pri${pile}`).css('border', '4px solid rgb(236, 232, 27)');
                            } else {
                                $(`#divpri${pile}`).css('border', '4px solid rgb(236, 232, 27)');
                            }

                            $(`#divpub${pile}`).css('border', '4px solid rgb(236, 232, 27)');
                        }
                        
                    } else if (update_type == 'unselect pile') {
                        if (update['player'] == id) {
                            $('.phase-pile').css('border', '4px solid black');
                            $(`#pri${player_hand}`).css('border', '4px solid black');
                        }

                    } else if (update_type == 'skip') {
                        let player_id = update['player'];
                        let times_skipped = update['times_skipped'];
                        $(`#turn${player_id}`).html(`SKIPPED (x${times_skipped})`);

                    } else if (update_type == 'move') {
                        let from_pile = update['from'];
                        let from_private_index = update['from_private_index'];
                        let to_pile = update['to'];
                        let to_index = update['to_index'];
                        let private_image = update['private_image'];
                        let public_image = update['public_image'];
                        let card_id = update['card_id'];

                        if (public_image !== null) {
                            let public_card = `
                            <div class=pile-card-div >
                                <img class=pile-card src=assets/${public_image}.png>
                            </div>
                            `
                            $(`#pub${to_pile}`).insertIndex(to_index, public_card);
                            
                            /* 
                            no need to make updates to public from pile
                            doesn't exist if player in submittedmode
                            moves should be hidden if player in regular mode
                            */
                        }
                        
                        $(`#pri${from_pile}`).children().eq(from_private_index).remove();

                        let onclick = `onmousedown="selectCard(event, '${card_id}')"`;
                        let private_card;
                        if (to_pile == player_hand) {
                            private_card = `<div class=hand-card ${onclick}><img src=assets/${private_image}.png></div>`;
                        } else {
                            private_card = `
                            <div class=pile-card-div >
                                <img class=pile-card ${onclick} src=assets/${private_image}.png>
                            </div>`

                            let n_cards = Math.max($(`#pri${from_pile}`).children().length - 1, 0);
                            $(`#ncards${from_pile}`).html(`(${n_cards})`)
                        }
                        $(`#pri${to_pile}`).insertIndex(to_index, private_card);
                        

                    } else if ((update_type == 'draw') || (update_type == 'deal')) {
                        has_drawn = (update_type == 'draw');
                        let to_pile = update['to'];
                        let to_private_index = update['to_private_index'];
                        let private_image = update['private_image'];
                        let public_image = update['public_image'];
                        let card_id = update['card_id'];
                        let top_card = update['top_card'];

                        let public_card = `
                        <div class=pile-card-div>
                            <img class=pile-card src=assets/${public_image}.png>
                        </div>
                        `
                        $(`#pub${to_pile}`).append(public_card);
                        
                        let onclick = `onmousedown="selectCard(event,'${card_id}')"`;
                        let private_card = `<div class=hand-card ${onclick}><img src=assets/${private_image}.png></div>`;
                        $(`#pri${to_pile}`).insertIndex(to_private_index, private_card);
                                                
                        $('#top-card').attr('src', `assets/${top_card}.png`);

                        $('.hand-card').find('img').css('border', '');
                        $(`#pri${to_pile}`).children().eq(to_private_index).find('img').css('border', '3px solid rgb(236, 232, 27)');
                        
                        if (current_player == id) {
                            if (has_phase) {
                                $(`#turn${current_player}`).html(submit_button);
                            } else {
                                $(`#turn${current_player}`).html('discarding a card...');
                            }
                        } else {
                            $(`#turn${current_player}`).html('discarding a card...');
                        }
                        

                    } else if (update_type == 'discard') {
                        has_drawn = false;

                        let from_pile_public = update['from_public'];
                        let from_pile_private = update['from_private'];
                        let from_public_index = update['from_public_index'];
                        let from_private_index = update['from_private_index'];
                        let top_card = update['top_card'];
                        
                        if (from_public_index !== null) {
                            $(`#pub${from_pile_public}`).children().eq(from_public_index).remove();
                        }
                        $(`#pri${from_pile_private}`).children().eq(from_private_index).remove();
                        $('#top-card').attr('src', `assets/${top_card}.png`);
                        $(`#turn${current_player}`).html('')

                        let n_cards = $(`#pri${from_pile_private}`).children().length;
                        $(`#ncards${from_pile_private}`).html(`(${n_cards})`)
                    }
                }
            }
        }
    )
}

dataInterval = setInterval(getData,500);
getData();

// Send move requests

function selectPile(pile_id){
    if (round_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectPile",JSON.stringify({
        game:game,
        id:id,
        pile:pile_id
    }),getData);
}

function selectCard(event, card){
    event.stopPropagation();
    if (round_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectCard",JSON.stringify({
        game:game,
        id:id,
        card:card
    }),getData);
}

function selectDeck(){
    if (round_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectDeck",JSON.stringify({
        game:game,
        id:id,
    }),getData);
}

function selectDiscard(){
    if (round_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectDiscard",JSON.stringify({
        game:game,
        id:id,
    }),getData);
}

function selectPlayer(selected_player){
    // Send request to move card
    $.post(SERVERURL+"selectPlayer",JSON.stringify({
        game:game,
        id:id,
        selected_player:selected_player
    }),getData);
}

function completePhase(selected_player){
    // Send request to move card
    $.post(SERVERURL+"completePhase",JSON.stringify({
        game:game,
        id:id,
    }),getData);
}

// Return to lobby button - sends "rematch" message to server and redirects to lobby
function returnToLobby(){
    $.post(SERVERURL+"return",JSON.stringify({
        game:game
    }),function(data){
        location.href = `summary.html?id=${id}&game=${game}`;
    });
}

// Check if game has returned to lobby
function checkIfReturn(){
    $.get(SERVERURL+"lobby?game="+game,
    function(data){
        // check for game start (no means that the game has returned to lobby)
        if (data["start"] == "no"){
            location.href = `lobby.html?id=${id}&game=${game}`;
        }
    }
    )
}
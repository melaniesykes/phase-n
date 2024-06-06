// Get query string parameters
let urlParams = new URLSearchParams(window.location.search);
let game = urlParams.get("game");
let id = urlParams.get("id");


// Get player name + turn number
let player_name, player_turn;
$.get(`${SERVERURL}player_data?game=${game}&id=${id}`,
    function(data){
        player_name = data["name"];
        player_turn = data["turn_number"];
    }
)

let turn = 0;

let game_over = false;

// Get updates on data
let dataInterval;

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
                // console.log(JSON.stringify(data));
                turn = data["turn"]; 
                setCards(data["player_cards"], data["selected_card"]);
                setStandings(data['public_info']);
                setPhasePiles(data["player_piles"], data["completed"], data["selected_card"], data["selected_pile"]);
                setTopcard(data["top_card"]);
                setPlayerTurnDisplay();
            }
        }
    )
}


function setCards(cards, selected_card){
    // Clear currently displayed cards
    $("#card-grid").html("");
    // Add each card
    for (let [card_id, card_file] of Object.entries(JSON.parse(cards))) {
        let onclick = `onmousedown="selectCard('${card_id}')"`
        if (selected_card == card_id) {
            selected = 'style="border:solid rgb(236, 232, 27) 3px"'
            // selected = 'style="filter:drop-shadow(5px 5px 0px rgb(236, 232, 27))"'
        } else {
            // selected = 'style ="filter:drop-shadow(5px 5px 0px rgba(29, 29, 29, 0.562))"'
            selected = ''
        }
        let card = `<div class=hand-card ><img src=assets/${card_file} ${selected} ${onclick}></div>`
        $("#card-grid").append(card);
    }
}

function labeledPile(pile_name, card_list, player_id) {
    let div_html = `<div class=phase-pile onmousedown="selectPile('${player_id}', '${pile_name}')">`;
    if (pile_name) {
        div_html += `<h5 class=pile-name>${pile_name}</h5>`;
    }
    div_html += `<div class=pile-cards-div onmousedown="selectPile('${player_id}', '${pile_name}')">`;
    // console.log('pile_name', card_id, 'card', card_file)
    for (card_file of card_list) {
        let card = `<div class=pile-card-div ><img src=assets/${card_file} class=pile-card></div>`;
        div_html += card;
    }
    div_html += "</div></div>";
    return div_html
}

function setStandings(standings){
    // Display standings (how many cards each player has)
    $("#standings").html("");

    for (let [player_num, player_info] of Object.entries(JSON.parse(standings))) {

        let div_html = "<div class=player-info>";
        if (player_num == turn){
            div_html = '<div class=player-info style="background-color:#f7913e;border:4px solid black">';
        }
        if (player_info['n_cards'] === null) {
            player_label = player_info['name'];
        } else {
            player_label = `${player_info['name']} ${player_info['n_cards']}`;
        }

        div_html += `<h2 onmousedown="selectPlayer('${player_info['id']}')">${player_label}</h2>`;
        
        div_html += "<div class=pile-grid>"
        for (let [pile_name, pile_cards] of Object.entries(player_info['piles'])){
            if (pile_name != 'hand') {
                div_html += labeledPile(pile_name, pile_cards, player_info['id']);
            }
        }
        div_html += "</div>";

        div_html += "<div class=pile-grid>"
        div_html += labeledPile('', player_info['piles']['hand']);
        div_html += "</div>";

        div_html += "</div>";
        $("#standings").append(div_html);

        // Check if someone has won and display winner message
        if (player_info['n_cards'] == 0){
            $("#win-display").css("display","block");
            $("#winner-name").html(`${player_info['name']} ended the round!`);
            // Stop the update interval
            clearInterval(dataInterval);
            game_over = true;
            // setInterval(checkIfReturn,1000);
        }
    }
}

function setPhasePiles(piles, completed, selected_card, selected_pile){
    // Display standings (how many cards each player has)
    $("#phase-grid").html("");
    for (let [pile_name, pile_cards] of Object.entries(JSON.parse(piles))){
        // console.log(completed.includes(pile_name), 'pile name', pile_name, 'cards', pile_cards, 'completed', completed)

        if (completed.includes(pile_name)) {
            color = "#66b85f";
        } else {
            color = "#f9a538";
        }

        let div_html = `<div class=phase-pile style="background-color:${color}">`;
        console.log(div_html)

        // let div_html = "<div class=phase-pile>";
        if (selected_pile == pile_name) {
            selected = 'style="background-color:rgb(236, 232, 27)"'
        } else {
            selected = ''
        }
        div_html += `<h2 class=pile-name onmousedown="selectPileLabel('${pile_name}')" ${selected}>${pile_name}</h2>`;
        div_html += `<div class=pile-cards-div onmousedown="selectPile(null, '${pile_name}')">`;
        
        for (const [card_id, card_file] of Object.entries(pile_cards)) {
            // console.log('i', card_id, 'card', card_file)

            let onclick = `onmousedown="selectCard('${card_id}')"`;
            if (selected_card == card_id) {
                selected = 'style="border:solid rgb(236, 232, 27) 3px"'
            } else {
                selected = ''
            }
            let card = `<div class=pile-card-div ${onclick}><img src=assets/${card_file} ${selected} class=pile-card></div>`;
            div_html += card;
        }                
        div_html += '</div></div>';
        $("#phase-grid").append(div_html);
    }
}

function setTopcard(card){
    // Display current top card
    document.getElementById("top-card").innerHTML = card;
}

function setPlayerTurnDisplay(){
    if (game_over){
        return "game over";
    }
    if (turn == player_turn){
        $("#player-turn-display").css("display","block");
    }
    else{
        $("#player-turn-display").css("display","none");
    }    
}


dataInterval = setInterval(getData,500);
getData();

// Send move requests

function selectPile(pile_owner_id, pile_name){
    if (game_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectPile",JSON.stringify({
        game:game,
        id:id,
        pile:pile_name,
        pile_owner_id:pile_owner_id

    }),getData);
}


function selectPileLabel(pile_name){
    if (game_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectPileLabel",JSON.stringify({
        game:game,
        id:id,
        pile:pile_name,
    }),getData);
}

function selectCard(card){
    if (game_over){
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
    if (game_over){
        return "game over";
    }
    // Send request to move card
    $.post(SERVERURL+"selectDeck",JSON.stringify({
        game:game,
        id:id,
    }),getData);
}

function selectDiscard(){
    if (game_over){
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

// Return to lobby button - sends "rematch" message to server and redirects to lobby
function returnToLobby(){
    $.post(SERVERURL+"return",JSON.stringify({
        game:game
    }),function(data){
        location.href = `lobby.html?id=${id}&game=${game}`;
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
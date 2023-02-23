// In order to run workers locally  I have disabled security.fileuri.strict_origin_policy in about:config (FireFox).
// This is a security risk, so reenable after testing!
const engine = new Worker('engine.js');

/**
 * Chess.js
 * 
 * A hideous single-file javascript chess engine.
 * I'm sure it can beat someone though.
 * 
 * Horribly inefficient, not very clever at all.
 */
const fenInputButton = document.querySelector('#fenInputButton');
const fenInputField = document.querySelector('#fenInput');
fenInputButton.addEventListener('click', (event) => {
    parseFen(fenInputField.value ? fenInputField.value : fenInputField.placeholder);
});

let isPlayerWhite = 1;
let isPlayerBlack = 0;

var board = [];
var turn = 1; //1 = white, 0 = black
var castling = 15; // 1111
var enPassant = -1;
var savedBoard = [];
var savedTurn = 1;
var savedCastling = 15;
var savedEnPassant = -1;

let generatedMoves = [];

var squares = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
];

var castlingRights = [
    7, 15, 15, 15,  3, 15, 15, 11,
    15, 15, 15, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15,
    15, 15, 15, 15, 15, 15, 15, 15,
    13, 15, 15, 15, 12, 15, 15, 14
];

var fenPieces = [
    'P', 'B', 'N', 'R', 'Q', 'K',
    'p', 'b', 'n', 'r', 'q', 'k'
];

var pieces = [
    'w_pawn', 'w_bishop', 'w_knight', 'w_rook', 'w_queen', 'w_king', 
    'b_pawn', 'b_bishop', 'b_knight', 'b_rook', 'b_queen', 'b_king'        
];

var pieceValues = [
    100, 350, 300, 500, 900, 9999, 
    -100, -350, -300, -500, -900, -9999
];

/** GUI */
let selectedSquare = undefined;
let boardSquareElements = [];

function init() {
    precomputeMoves();

    initBoard();
    parseFen(fenInputField.value ? fenInputField.value : fenInputField.placeholder);
    
    generatedMoves = generateLegalMoves();
}

function initBoard() {
    const board = document.querySelector('.board');
    let rowElement;
    let row = 0;
    let isLightSquare = 0;
    for(let i = 0; i < 64; i++) {
        if(i % 8 == 0) {
            isLightSquare ^= 1;
            row++;
            rowElement = document.createElement('div');
            rowElement.className = 'row';
            board.appendChild(rowElement);
        }

        let squareElement = document.createElement('div');        
        squareElement.classList.add('square', isLightSquare ? 'light' : 'dark');        
        isLightSquare ^= 1;
        
        rowElement.appendChild(squareElement);

        // Populate array for later use
        boardSquareElements[i] = squareElement;
    }
}

function clearBoardGui() {
    for(let square = 0; square < 64; square++) {        
        boardSquareElements[square].classList.remove('piece');
        let image = boardSquareElements[square].getElementsByTagName('img');
        if(image[0]) {
            boardSquareElements[square].removeChild(image[0]);
        }
    }
}

function parseFen(fen) {  
    for(let square = 0; square < 64; square++) {   
        board[square] = null;
    }
    clearBoardGui();
    
    let ptr = 0;

    // Parse Pieces
    for(let rank = 0; rank < 8; rank++) {
        for(let file = 0; file < 8; file++) {
            const square = rank * 8 + file;                

            if((fen[ptr] >= 'a' && fen[ptr] <= 'z') || (fen[ptr] >= 'A' && fen[ptr] <= 'Z')) {
                let pieceIndex = this.fenPieceToIndex(fen[ptr]);                    
                board[square] = pieces[pieceIndex];                
                ptr++;
            }

            if(fen[ptr] >= '0' && fen[ptr] <= '9') {
                let offset = fen[ptr];                    
                let foundPiece = false;
                for(let pieceIndex = 0; pieceIndex < fenPieceToIndex('k'); pieceIndex++) {
                    if(board[pieceIndex] > -1) foundPiece = true;                        
                }
                
                if(!foundPiece) file--;                    

                file += + offset;                    
                ptr++;
            }

            if(fen[ptr] == '/') {
                ptr++;                
            }                                   
        }
    }

    setPieces();
}

function setPieces() {
    for(let rank = 0; rank < 8; rank++) {
        for(let file = 0; file < 8; file++) {
            const square = rank * 8 + file;   
            if(board[square]) {
                let pieceFileName = 'Images/'+board[square].toLowerCase()+'.png';
                let imageElement = document.createElement('img');
                imageElement['src'] = pieceFileName;   
                boardSquareElements[square].classList.add('piece');
                boardSquareElements[square].appendChild(imageElement);
            }
        }
    }

    generatedMoves = generateLegalMoves();    
}

function saveBoard() {
    savedBoard =  structuredClone(board);
    savedTurn = new Number(turn);
    savedCastling = new Number(castling);
    savedEnPassant = new Number(enPassant);    
}

function takeBack() {    
    board = structuredClone(savedBoard);
    turn = new Number(savedTurn);
    castling = new Number(savedCastling);
    enPassant = new Number(savedEnPassant);    
}

function makeMoveCapturesOnly(move) {
    if(move.capture) return makeMove(move);
    else return false;
}

// Returns false if move was illegal, otherwise true
function makeMove(move) {
    if(!move) return false;

    if(move.enPassant) {
        if(turn == 1) {
            board[move.target + 8] = null;
        } else {
            board[move.target - 8] = null;
        }
    }

    board[move.target] = move.promotion ? pieces[move.promotion] : pieces[move.piece];    
    board[move.source] = null;

    enPassant = undefined;
    if(move.doublePush) enPassant = (turn == 1) ? move.target + 8 : move.target - 8;

    if(move.castling) {        
        switch(move.target) {            
            // White Kingside
            case squareToIndex('g1'):                
                board[squareToIndex('h1')] = null;
                board[squareToIndex('f1')] = 'w_rook';
                break;

            // White Queenside
            case squareToIndex('c1'):
                board[squareToIndex('a1')] = null;
                board[squareToIndex('d1')] = 'w_rook';
                break;

            // Black Kingside
            case squareToIndex('g8'):
                board[squareToIndex('h8')] = null;
                board[squareToIndex('f8')] = 'b_rook';
                break;

            // Black Queenside
            case squareToIndex('c8'):
                board[squareToIndex('a8')] = null;
                board[squareToIndex('d8')] = 'b_rook';
                break;
        }
    }

    castling &= castlingRights[move.source];
    castling &= castlingRights[move.target];

    turn = (turn == 1) ? 0 : 1;

    let kingSquare;
    for(let i = 0; i < 64; i++) {
        if((turn == 1 && board[i] == 'w_king') || (turn == 0 && board[i] == 'b_king')) {
            kingSquare = i;
            break;
        }
    }

    // Disallow moves that result in a check
    if(isSquareAttackedBy(kingSquare, (turn == 1) ? 0 : 1)) {        
        return false;
    }
    
    return true;
}

// number square, number attacker
function isSquareAttackedBy(square, attacker) {
    // Logic to check if square is under attack
    return false;
}

// Returns false if move was illegal, otherwise true
function generateLegalMoves() {
    let pseudoLegalMoves = generateMoves();
    return pseudoLegalMoves;
}

// Takes a FEN piece and converts it to the corresponding piece index
function fenPieceToIndex(fen) {
    return fenPieces.findIndex(piece => piece === fen);
}

// Takes a piece and converts it to the corresponding piece index
function pieceToIndex(piece) {
    return pieces.findIndex(p => p === piece);
}

/** INPUT
 * 
 * 
 * 
 * 
 * ______________________________________________
 */
document.addEventListener('click', (event) => {
    clickedSquare(event.pageX, event.pageY);
});

function clickedSquare(x, y) {
    let position = document.querySelector('.board').getBoundingClientRect();
    x = Math.floor(x);
    y = Math.floor(y);  
    
    let file = Math.floor(((x - Math.ceil(position.left)) / 64));
    let rank = Math.floor(((y - Math.floor(position.top)) / 64));
    let square = rankAndFileToSquare(rank, file);     

    // If square is outside board, reset selected square.
    if(square < 0 || square >= 64) {
        setSelectedSquare(undefined);
        return;
    }

    // If we have a selected square already
    if(selectedSquare) {
        if(square == selectedSquare) {
            setSelectedSquare(undefined);
            return;
        }
        
        // If player turn, and the selected piece belongs to the player: WHITE
        if(turn == 1 && getPieceColor(board[selectedSquare]) == 1 && isPlayerWhite) {
            setSelectedSquare(
                makePlayerMove(selectedSquare, square)
                ?   undefined
                :   square);
            return;
        }

        // If player turn, and the selected piece belongs to the player: BLACK
        if(turn == 0 && getPieceColor(board[selectedSquare]) == 0 && isPlayerBlack) {
            setSelectedSquare(
                makePlayerMove(selectedSquare, square)
                ?   undefined
                :   square);
            return;
        }
    }

    setSelectedSquare(square);
}

// returns true if valid move
async function makePlayerMove(fromSquare, toSquare) {
    if(fromSquare < 0 || fromSquare >= 64 || toSquare < 0 || toSquare >= 64) return false;
    if(!board[fromSquare]) return false; 

    let move = generatedMoves.filter(move => move.source == fromSquare && move.target == toSquare);    

    if(move.length) {
        makeMove(move[0]);
    }
    clearBoardGui();
    setPieces();

    if((turn == 1 && !isPlayerWhite) || (turn == 0 && !isPlayerBlack)) { 
        
        console.time('searchPosition');
        let move = await searchPosition();
        console.timeEnd('searchPosition');
        console.log("AI searched "+nodes+" nodes at a depth of "+depth);

        makeMove(move);
        clearBoardGui();
        setPieces();
    }

    return true;
}

// Set square class to selected, targeted, or neither based on turn and legal moves.
function setSelectedSquare(square) {    
    let targetSquaresFromSource = generatedMoves.filter(move => move.source == square).map(move => move.target);    

    selectedSquare = square;
    for(let i = 0; i < 64; i++) {        
        if(selectedSquare === i) boardSquareElements[i].classList.add('selected');
        else if(targetSquaresFromSource.some(target => target == i)) {            
            boardSquareElements[i].classList.remove('selected');                
            if(getPieceColor(board[selectedSquare]) == turn
            && ((turn == 1 && isPlayerWhite) || (turn == 0 && isPlayerBlack))) 
                boardSquareElements[i].classList.add('targeted');
        }
        else {
            boardSquareElements[i].classList.remove('selected');
            boardSquareElements[i].classList.remove('targeted');
        }
    }
}

/** UTILS
 * 
 * 
 * 
 */
function rankAndFileToSquare(rank, file) {
    return rank * 8 + file;
}

// Takes a square and converts it to an index
function squareToIndex(arg) {    
    return squares.findIndex(s => s === arg);
}

function fileFromSquare(square) {
    let s = squares[square];
    return s ? s[0] : undefined;
}

function rankFromSquare(square) {
    let s = squares[square];
    return s ? s[1] : undefined;
}


/**
 * MOVE GENERATION
 * 
 * move {
 *  source: int,
 *  target: int,
 *  piece: int,
 *  promotion: int,
 *  capture: bool,
 *  doublePush: bool,
 *  enPassant: bool,
 *  castling: bool,
 * }
 * 
 */
let knightAttacks = []; // Precompute all knight attacks for each square.
let kingAttacks = []; // Precompute all king moves for each square.

function generateMoves() {
    let moves = [];
    let target;

    // 0 - 5 is piece indices for white pieces, 
    // and 6 to 11 is piece indices for black pieces.
    let startPieceIndex = (turn == 1) ? 0 : 6;
    let endPieceIndex = (turn == 1) ? 5 : 11;

    // Loop over all squares
    for(let square = 0; square < 64; square++) {
        let piece = pieceToIndex(board[square]);        

        // Skip square if there is no piece of the right color.
        if((piece < startPieceIndex)
            || (piece > endPieceIndex))
                continue;        

        // Calculate available moves for each piece
        // vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

        // WHITE PAWNS
        if(piece === 0) {                    
            target = square - 8;
            if(target < 0) continue;

            // Quiet moves, i.e. no capture.
            if(!board[target]) {
                // Promotion
                if(square >= squareToIndex('a7') && square <= squareToIndex('h7')) {
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('w_queen'), capture: false, doublePush: false, enPassant: false, castling: false});                    
                } else {
                  // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: false});                  

                  // Double Push
                  if(target - 8 < 0) continue;
                  if(square >= squareToIndex('a2') && square <= squareToIndex('h2') && !board[target-8]) {
                    moves.push({source: square, target: target - 8, piece: piece, promotion: null, capture: false, doublePush: true, enPassant: false, castling: false});                    
                  }
                }
            }

            // Attacks
            if(board[square - 7] && squares[square][0] !== 'h') {
                target = square - 7;
                if(target < 0) continue;                

                if(square >= squareToIndex('a7') && square <= squareToIndex('h7')) {
                    // Promote
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('w_queen'), capture: true, doublePush: false, enPassant: false, castling: false});                    
                } else {
                    // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: false, castling: false});                  
                }
            }            

            if(board[square - 9] && squares[square][0] !== 'a') {
                target = square - 9;
                if(target < 0) continue;

                if(square >= squareToIndex('a7') && square <= squareToIndex('h7')) {
                    // Promote
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('w_queen'), capture: true, doublePush: false, enPassant: false, castling: false});                    
                } else {
                    // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: false, castling: false});                  
                }
            }

            // En Passant
            if(enPassant) {
                if(fileFromSquare(square) != 'a' && square - 9 == enPassant)
                    moves.push({source: square, target: square - 9, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: true, castling: false});
                if(fileFromSquare(square) != 'h' && square - 7 == enPassant)
                    moves.push({source: square, target: square - 7, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: true, castling: false});                
            }
        }

        // WHITE KING
        if(piece === 5) {
            // Kingside Castling
            if(castling & 1) {
                if(!board[squareToIndex('f1')]
                && !board[squareToIndex('g1')]
                // && isSquareAttackedBy('e1', 'black')
                // && isSquareAttackedBy('f1', 'black')
                ) {
                    moves.push({source: squareToIndex('e1'), target: squareToIndex('g1'), piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: true});                
                }
            }

            // Queenside Castling
            if(castling & 2) {
                if(!board[squareToIndex('d1')]
                && !board[squareToIndex('c1')]
                && !board[squareToIndex('b1')]
                // && isSquareAttackedBy('e1', 'black')
                // && isSquareAttackedBy('d1', 'black')
                ) {
                    moves.push({source: squareToIndex('e1'), target: squareToIndex('c1'), piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: true});                                    
                }
            }

        }

        // BLACK PAWN
        if(piece === 6) {                    
            target = square + 8;
            if(target >= 64) continue;

            // Quiet moves
            if(!board[target]) {
                // Promotion
                if(square >= squareToIndex('a2') && square <= squareToIndex('h2')) {
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('b_queen'), capture: false, doublePush: false, enPassant: false, castling: false});                    
                } else {
                  // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: false});                  

                  // Double Push
                  if(target + 8 >= 64) continue;
                  if(square >= squareToIndex('a7') && square <= squareToIndex('h7') && !board[target+8]) {
                    moves.push({source: square, target: target + 8, piece: piece, promotion: null, capture: false, doublePush: true, enPassant: false, castling: false});                    
                  }
                }
            }

            // Attacks
            if(board[square + 7] && squares[square][0] !== 'a') {
                target = square + 7;
                if(target >= 64) continue;

                if(square >= squareToIndex('a2') && square <= squareToIndex('h2')) {
                    // Promote
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('b_queen'), capture: true, doublePush: false, enPassant: false, castling: false});                    
                } else {
                    // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: false, castling: false});                  
                }
            }

            if(board[square + 9] && squares[square][0] !== 'h') {
                target = square + 9;
                if(target >= 64) continue;

                if(square >= squareToIndex('a2') && square <= squareToIndex('h2')) {
                    // Promote
                    moves.push({source: square, target: target, piece: piece, promotion: pieceToIndex('b_queen'), capture: true, doublePush: false, enPassant: false, castling: false});                    
                } else {
                    // One Step
                  moves.push({source: square, target: target, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: false, castling: false});                  
                }
            }

            // En Passant
            if(enPassant) {
                if(fileFromSquare(square) != 'h' && square + 9 == enPassant)
                    moves.push({source: square, target: square + 9, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: true, castling: false});
                if(fileFromSquare(square) != 'a' && square + 7 == enPassant)
                    moves.push({source: square, target: square + 7, piece: piece, promotion: null, capture: true, doublePush: false, enPassant: true, castling: false});                
            }
        }

        // BLACK KING
        if(piece === 11) {
            // Kingside Castling            
            if(castling & 4) {                
                if(!board[squareToIndex('f8')]
                && !board[squareToIndex('g8')]
                // && isSquareAttackedBy('e8', 'black')
                // && isSquareAttackedBy('f8', 'black')
                ) {
                    moves.push({source: squareToIndex('e8'), target: squareToIndex('g8'), piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: true});                    
                }
            }

            // Queenside Castling
            if(castling & 8) {                
                if(!board[squareToIndex('d8')]
                && !board[squareToIndex('c8')]
                && !board[squareToIndex('b8')]
                // && isSquareAttackedBy('e8', 'black')
                // && isSquareAttackedBy('d8', 'black')
                ) {
                    moves.push({source: squareToIndex('e8'), target: squareToIndex('c8'), piece: piece, promotion: null, capture: false, doublePush: false, enPassant: false, castling: true});                    
                }
            }
        }        

        // BISHOP
        if(piece == 1 || piece == 7) {
            // Up Right
            let target = square - 7;
            let isCapture;
            while(target > 0 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 7;
            }
            target = square - 9;
            isCapture = false;
            while(target > 0 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 9;
            }
            target = square + 7;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 7;
            }
            target = square + 9;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 9;
            }
        }

        // KNIGHT
        if(piece === 2 || piece === 8) {
            let targets = knightAttacks[square];                    
            for(let i = 0; i < targets.length; i++) {                
                target = targets[i];                                             
                if(getPieceColor(board[target]) != turn) {                    
                    moves.push({source: square, target: target, piece: piece, promotion: null, capture: getPieceColor(board[target]) == (turn == 1) ? 0 : 1, doublePush: false, enPassant: false, castling: false});                    
                }
            }
        }

        // ROOK
        if(piece == 3 || piece == 9) {
            // Up
            let target = square - 8;
            let isCapture;
            while(target > 0 && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 8;
            }
            // Left
            target = square - 1;
            isCapture = false;
            while(target > 0 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 1;
            }
            // Right
            target = square + 1;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 1;
            }
            // Down
            target = square + 8;
            isCapture = false;
            while(target < 64 && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 8;
            }
        }

        // QUEEN
        if(piece == 4 || piece == 10) {
            // Up Right
            let target = square - 7;
            let isCapture;
            while(target > 0 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 7;
            }
            target = square - 9;
            isCapture = false;
            while(target > 0 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 9;
            }
            target = square + 7;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 7;
            }
            target = square + 9;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 9;
            }
            // Up
            target = square - 8;
            isCapture = false;
            while(target > 0 && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 8;
            }
            // Left
            target = square - 1;
            isCapture = false;
            while(target > 0 && fileFromSquare(target) != 'h' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target - 1;
            }
            // Right
            target = square + 1;
            isCapture = false;
            while(target < 64 && fileFromSquare(target) != 'a' && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 1;
            }
            // Down
            target = square + 8;
            isCapture = false;
            while(target < 64 && !isPieceOfColorOnSquare(target, turn) && !isCapture) {
                isCapture = isPieceOfColorOnSquare(target, (turn == 1) ? 0 : 1);
                moves.push({source: square, target: target, piece: piece, promotion: null, capture: isCapture, doublePush: false, enPassant: false, castling: false});
                target = target + 8;
            }
        }

        

        // KING
        if(piece === 5 || piece === 11) {
            let targets = kingAttacks[square];            
            for(let i = 0; i < targets.length; i++) {                
                target = targets[i];                
                if(getPieceColor(board[target]) != turn) {
                    moves.push({source: square, target: target, piece: piece, promotion: null, capture: getPieceColor(board[target]) == (turn == 1) ? 0 : 1, doublePush: false, enPassant: false, castling: false});                    
                }
            }
        }
        
    }

    return moves;
}

function precomputeKnightMoves() {
    for(let square = 0; square < 64; square++) {
        knightAttacks[square] = [];

        if(square + 17 < 64 && fileFromSquare(square) != 'h') knightAttacks[square].push(square + 17);
        if(square + 10 < 64 && fileFromSquare(square) != 'a') knightAttacks[square].push(square + 15);
        if(square + 10 < 64 && fileFromSquare(square) != 'h' && fileFromSquare(square) != 'g') knightAttacks[square].push(square + 10);
        if(square + 6 < 64 && fileFromSquare(square) != 'a' && fileFromSquare(square) != 'b') knightAttacks[square].push(square + 6);

        if(square - 17 > 0 && fileFromSquare(square) != 'a') knightAttacks[square].push(square - 17);
        if(square - 10 > 0 && fileFromSquare(square) != 'h') knightAttacks[square].push(square - 15);
        if(square - 10 > 0 && fileFromSquare(square) != 'a' && fileFromSquare(square) != 'b') knightAttacks[square].push(square - 10);
        if(square - 6 > 0 && fileFromSquare(square) != 'h' && fileFromSquare(square) != 'g') knightAttacks[square].push(square - 6);
    }
}

function precomputeKingMoves() {
    for(let square = 0; square < 64; square++) {
        kingAttacks[square] = [];

        if(square + 8 < 64) kingAttacks[square].push(square + 8);
        if(square + 9 < 64 && fileFromSquare(square + 9) != 'h') kingAttacks[square].push(square + 9);
        if(square + 7 < 64 && fileFromSquare(square + 7) != 'a') kingAttacks[square].push(square + 7);
        if(square + 1 < 64 && fileFromSquare(square + 1) != 'h') kingAttacks[square].push(square + 1);

        if(square - 8 > 0) kingAttacks[square].push(square - 8);
        if(square - 9 > 0 && fileFromSquare(square - 9) != 'a') kingAttacks[square].push(square - 9);
        if(square - 7 > 0 && fileFromSquare(square - 7) != 'h') kingAttacks[square].push(square - 7);
        if(square - 1 > 0 && fileFromSquare(square - 1) != 'a') kingAttacks[square].push(square - 1);
    }
}

function precomputeMoves() {
    precomputeKnightMoves();
    precomputeKingMoves();
}

// Return 1 for white, 0 for black
function getPieceColor(piece) {
    let pieceIndex = pieceToIndex(piece);
    if(pieceIndex >= 0 && pieceIndex < 6) return 1;
    if(pieceIndex >= 6 && pieceIndex < 12) return 0;
    return undefined;
}

function isPieceOfColorOnSquare(square, color) {
    let piece = board[square];
    return getPieceColor(piece) === color;
}



//
// ENGINE
//
let bestMove;
let nodes;
let ply; // Half-moves
var depth = 4;

function searchPosition() {
    return runSearch();
}

let takeBacks, saves = 0;

function runSearch() {    
    ply = 0;
    nodes = 0;
    takeBacks = 0;
    saves = 0;

    negamax(-50000, 50000, depth);
    
    return bestMove;
}

// Minimax algorithm with alpha-beta-pruning
function negamax(alpha, beta, depth) {
    // Exit condition. Before exiting, make sure we aren't sacrificing a piece!
    if(depth == 0) return quiescence(alpha, beta);    

    nodes++;

    let moves = generateLegalMoves();

    let oldAlpha = alpha;
    let bestMoveSoFar;    

    // By sorting moves according to a scoring system we attempt to maximize the pruning
    // by prioritizing promising moves.
    moves = sortMoves(moves);

    // Loop through each generated move
    for(const move of moves) {
        // Preserve board state        
        const savedBoard =  structuredClone(board);
        const savedTurn = new Number(turn);
        const savedCastling = new Number(castling);
        const savedEnPassant = new Number(enPassant);    

        ply++;

        makeMove(move);

        // Recursion. Follow the line until depth runs out ( or pruning occurs )
        // Invert alpha and beta as the turn has been changed
        let score = -negamax(-beta, -alpha, depth - 1);

        ply--;

        // Restore board        
        board = savedBoard;
        turn = savedTurn;
        castling = savedCastling;
        enPassant = savedEnPassant;

        // Beta Pruning
        // Fail-hard beta cutoff is easier than fail-soft
        if( score >= beta ) {
            return beta;
        }

        if( score > alpha ) {
            alpha = score;

            if(ply == 0) bestMoveSoFar = move; // Initialize
        }
    }

    if(moves.length == 0) {
        // if king in check -> checkmate: Assume checkmate in lieu of isSquareAttacked function
        // if king not in check -> stalemate.
        // Add ply to order checkmates by search depth.
        return -49000 + ply;
    }

    // If we've at the end of looping through all moves found a better scoring move, make it best move.
    if(oldAlpha != alpha) {
        bestMove = bestMoveSoFar;
    }

    return alpha;
}

function quiescence(alpha, beta) {
    nodes++;

    let evaluation = evaluatePosition();

    // Fail-hard beta pruning
    if( evaluation >= beta ) return beta;
    // Principled variation (fancy talk for best move)
    if( evaluation > alpha) alpha = evaluation;

    // Generate capture moves only, 
    // we intend to follow chains of capture to see if the move was good after all trades are done.
    let moves = generateMoves().filter(m => m.capture);
    moves = sortMoves(moves);

    // Same principle as in negamax, but only follow chains of captures.
    for(const move of moves) {
        // Preserve board state        
        const savedBoard =  structuredClone(board);
        const savedTurn = new Number(turn);
        const savedCastling = new Number(castling);
        const savedEnPassant = new Number(enPassant);
        ply++;
        
        if(!makeMoveCapturesOnly(move)) {
            continue;
        }
        
        let score = -quiescence(-beta, -alpha);

        ply--;

        // Restore board        
        board = savedBoard;
        turn = savedTurn;
        castling = savedCastling;
        enPassant = savedEnPassant;

        if(score > alpha) {
            alpha = score;
            if( score >= beta) return beta;
        }
        
        
    }

    return alpha;
}

// Sort moves by how promising they seem.
// Better sorting means moves are more efficiently pruned in the algorithm, 
// reducing amount of nodes that need to be searched.
function sortMoves(moves) {
    let scores = [];
    for(let i = 0; i < moves.length; i++) {
        scores[i] = scoreMove(moves[i]);
    }

    for(let currentMove = 0; currentMove < moves.length; currentMove++) {
        for(let nextMove = currentMove + 1; nextMove < moves.length; nextMove++) {
            if( scores[currentMove] < scores[nextMove]) {
                let tempScore = {...scores[currentMove]};
                scores[currentMove] = {...scores[nextMove]};
                scores[nextMove] = {...tempScore};

                let tempMove = {...moves[currentMove]};
                moves[currentMove] = {...moves[nextMove]};
                moves[nextMove] = {...tempMove};
            }
        }
    }

    return moves;
}

// Super basic at the moment. Can be improved by, for example:
// * Score by MVV_LVA table (most valuable victim vs least valuable attacker)
// * Score 'killer moves' (moves that may result in a capture)
// * Score 'historical moves'
function scoreMove(move) {
    if(move.capture) return 10000;
    return 0;
}

// Score board based on its current state.
// Has no ability to look ahead, if it did a chess engine would be easy.
// Here's the place to add tables for positional scoring by opening, midgame, and endgame.
function evaluatePosition() {
    let value = 0;
    let piece, square;

    for(let i = 0; i < 64; i++) {
        if(board[i]) {
            value += pieceValues[pieceToIndex(board[i])];
        }
    }

    return turn == 1 ? value : -value;
}


init();
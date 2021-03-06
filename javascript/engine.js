/* ---------------------------- new engine ------------------------------------------ */
var Engine = (function() {
    var logging   = true;
    var debugging = true;

    //stores cursor's position from the top left corner; x corresponds to left-right; y corresponds to up-down
    var cursor = {
        x: 0,
        y: 0,
    };
    
    var infos_div = create_element("div", "infos");

    var click = 0; //click state
    
    var canvas    = create_element("canvas", "game");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    var cx        = canvas.getContext("2d");

    //state of the keys are stored in MOTHERSHIP

    //to store stuff
    var shooters = [], bullets = [], enemies = [], objects = [];

    //for animation
    var last_time  = null, lapse = 0;
    var paused     = false;
    var num_frames = 0;
    
    //for the game
    var difficulty    = 0; //good luck
    var max_enemies   = 2;
    var spawn_delay   = 1500; //good luck
    var score         = 0; //good luck
    var score_element = create_element("p", "info");
    
    //powerups
    var rapid_fire       = false;
    var bouncing_bullets = false;
    var piercing_shots   = false;
    var invincibility    = false;
    var fragile_enemies  = false;
    
    //each powerup lasts for 7.5 seconds. enjoy it while you can!
    var power_up_duration = 7500;

    return {
        start_logging: function() { logging = true; },
        stop_logging: function() { logging = false; },
        log: function(msg) {
            if (logging) {
                console.log(msg);
            }
        },

        init: function() {
            //set up the mouse move event listeners
            document.onmousemove = function(e) {
                cursor.x = e.pageX;
                cursor.y = e.pageY;
            }

            //set up click event listeners
            addEventListener("mousedown", function() {
                if (click % 2 == 0) {
                    click = click + 1;
                    //Engine.log("a mouse click at " + cursor.x + ", " + cursor.y);
                }
            });

            addEventListener("mouseup", function() {
                if (click % 2 == 1) {
                    click = click + 1;
                }
            });

            //set up key event listeners, namely arrow keys or WASD
            // w: 87, a: 65, s: 83, d: 68
            // left: 37, up: 38, right: 39, down: 40
            addEventListener("keydown", function(e) {
                switch (e.keyCode) {
                    case 87:
                    case 38:
                        Mothership.directions.up = true;
                        //Engine.log("UP key pressed");
                        break;

                    case 83:
                    case 40:
                        Mothership.directions.down = true;
                        //Engine.log("DOWN key pressed");
                        break;
                        
                    case 65:
                    case 37:
                        Mothership.directions.left = true;
                        //Engine.log("LEFT key pressed");
                        break;

                    case 68:
                    case 39:
                        Mothership.directions.right = true;
                        //Engine.log("RIGHT key pressed");
                        break;
                }
            });

            addEventListener("keyup", function(e) {
                switch (e.keyCode) {
                    case 87:
                    case 38:
                        Mothership.directions.up = false;
                        break;
                        
                    case 83:
                    case 40:
                        Mothership.directions.down = false;
                        break;
                        
                    case 65:
                    case 37:
                        Mothership.directions.left = false;
                        break;
                        
                    case 68:
                    case 39:
                        Mothership.directions.right = false;
                        break;
                        
                    case 80: //"P" key, for pausing
                        Engine.toggle_pause();
                        break;
                }
            });

            //draw background, which will also serve as a wrapper for everything else
            document.body.appendChild(canvas);
            document.body.appendChild(infos_div);
            infos_div.appendChild(score_element);
            this.update_score();
            
            if (debugging) {
                this.debug();
            }

            Mothership.init();
        },
        
        debug: function() {
            //add frame rate counter, and other informations
            var frame_rate_p       = create_element("p", "info");
            frame_rate_p.innerHTML = "frame rate: loading...";
            infos_div.appendChild(frame_rate_p);
            
            var num_bullets_p       = create_element("p", "info");
            num_bullets_p.innerHTML = "bullets: loading...";
            infos_div.appendChild(num_bullets_p);
            
            setInterval(function() {
                //update the frame rate counter
                frame_rate_p.innerHTML = "frame rate: " + num_frames;
                num_frames             = 0;
                
                num_bullets_p.innerHTML = "bullets: " + bullets.length;
            }, 1000);
        },
        
        draw_canvas: function(lapse) {
            //animation code below
            //basically, ask the mothership, the shooters, each bullet and each enemy where it should be.
            //draw them there.
            //if they are outside the windows, don't draw them.
            
            //first clear the canvas
            cx.clearRect(0, 0, Engine.game_area_x, Engine.game_area_y);
            
            //draw the background
            this.draw_background(cx);
            /*
            cx.fillStyle = "dimgray";
            cx.fillRect(0, 0, Engine.game_area_x, Engine.game_area_y);
            */
            
            //draw the mothership
            Mothership.get_new_position(lapse);
            Mothership.draw(cx);
            
            //draw the shooters
            shooters = shooters.filter(function(shooter) { return shooter.active; });
            shooters.forEach(function(shooter) {
                with (shooter) {
                    get_new_position(lapse);
                    draw(cx);
                    if (loaded && click % 2 == 1) {
                        bullets.push(fire());
                    }
                }
            });
            
            //draw the bullets
            bullets = bullets.filter(function(bullet) {return bullet.active;});
            bullets.forEach(function(bullet) {
                with (bullet) {
                    get_new_position(lapse);
                    draw(cx);
                }
            });
            
            //draw the enemies
            enemies = enemies.filter(function(enemy) {return enemy.active;});
            enemies.forEach(function(enemy) {
                with (enemy) {
                    get_new_position(lapse);
                    draw(cx);
                }
            });
            
            //I'm just repeating myself at this point. why!?
            objects = objects.filter(function(object) { return object.active;});
            objects.forEach(function(object) {
                with (object) {
                    get_new_position(lapse);
                    draw(cx);
                }
            });
            
            this.draw_crosshair(cx);
        },
        
        draw_background: function(context) {
            for (var y = 0; y < Engine.game_area_y; y += 128) {
                for (var x = 0; x < Engine.game_area_x; x += 128) {
                    context.drawImage(Assets.background, x, y);
                }
            }
        },
        
        draw_crosshair: function(context) {
            context.drawImage(Assets.crosshair, cursor.x - 15, cursor.y - 15);
        },
        
        animate: function(time) {
            if (last_time == null) {
                lapse = 0;
            } else {
                lapse = time - last_time;
            }
            
            last_time = time;
            if (!paused) {
                Engine.draw_canvas(lapse);
                num_frames++;
            }
            
            requestAnimationFrame(Engine.animate);
        },
        
        toggle_pause: function() {
            paused = !paused;
        },

        add_shooter: function(shooter) {
            shooters.push(shooter || new Shooter(Mothership.x, Mothership.y, 0));
        },
        
        add_enemy: function(enemy) {
            enemies.push(enemy || new Enemy(0, 0, Math.sqrt(0.5), Math.sqrt(0.5)));
        },
        
        add_power_up: function(power_up) {
            objects.push(power_up || generate_power_up());
        },
        
        start_game: function() {
            for (var a = 0; a < 2 * Math.PI; a += 0.25 * Math.PI) {
                Engine.add_shooter(new Shooter(Mothership.x, Mothership.y, a));
            }
            
            Engine.spawn_enemies();
            
            //start the animation...
            requestAnimationFrame(this.animate);
        },
        
        end_game: function() {
            //end the game
            Engine.toggle_pause();
            //Engine.log("score: " + score);
            //Engine.log("player has lost.");
        },
        
        //updating the score each frame is begging for a system crash, especially on my HP Pavilion g6 from 2012.
        update_score: function() {
            score_element.innerHTML = "score: " + score;
            
            //Engine.log("updating score... and everything else...");
            
            max_enemies = score + 1;
            //Engine.log("max enemies now: " + max_enemies);
            
            difficulty = 1 - ( 1 / score);
            //Engine.log("difficulty now: " + difficulty);
            
            spawn_delay = Math.floor(1500 / difficulty || 3500);
            //Engine.log("spawn delay now: " + spawn_delay);
            
            //additional processing
            if (score > 0 && score % 20 == 0 && Engine.objects.length == 0) {
                Engine.objects.push(generate_power_up());
            }
        },
        
        add_score: function() { score = score + 1; this.update_score();},
        
        activate_power_up: function(power_up) {
            switch (power_up) {
                //debug! sorry for the long base statements.
                case "rapid fire":
                    //Engine.log("activating 'rapid fire' powerup...");
                    rapid_fire = true;
                    setTimeout(function() {
                        rapid_fire = false;
                        //Engine.log("deactivating 'rapid fire' powerup...");
                    }, power_up_duration);
                    break;
                case "bouncing bullets":
                    //Engine.log("activating 'bouncing bullets' powerup...");
                    bouncing_bullets = true;
                    setTimeout(function() {
                        bouncing_bullets = false;
                        //Engine.log("deactivating 'bouncing bullets' powerup...");
                    }, power_up_duration);
                    break;
                case "piercing shots": 
                    //Engine.log("activating 'piercing shots' powerup...");
                    piercing_shots = true;
                    setTimeout(function() {
                        piercing_shots = false;
                        //Engine.log("deactivating 'piercing shots' powerup...");
                    }, power_up_duration);
                    break;
                case "invincibility":
                    //Engine.log("activating 'invincibility' powerup...");
                    invincibility = true;
                    setTimeout(function() {
                        invincibility = false;
                        //Engine.log("deactivating 'invincibility' powerup...");
                    }, power_up_duration);
                    break;
                case "fragile enemies":
                    //Engine.log("activating 'fragile enemies' powerup...");
                    fragile_enemies = true;
                    setTimeout(function() {
                        fragile_enemies = false;
                        //Engine.log("deactivating 'fragile enemies' powerup...");
                    }, power_up_duration);
                    break;
                default:
                    //Engine.log("unrecognized powerup '" + power_up + "' -- what is this?");
            }
            
            //all that's missing is a function for creating powerups!
        },
        
        create_enemy: function() {
            //pick a random point on the sides
            var spawn_x = (function() {
                if (Math.random() < 0.5) {
                    return 0;
                } else {
                    return Engine.game_area_x;
                }
            })();
            
            var spawn_y = Math.random() * Engine.game_area_y;
            
            var vector_x = (function() {
                if (Math.random < 0.5) {
                    return 0.707;
                } else {
                    return -0.707;
                }
            })();
            
            var vector_y = (function() {
                if (Math.random < 0.5) {
                    return 0.707;
                } else {
                    return -0.707;
                }
            })();
            
            Engine.add_enemy(new Enemy(spawn_x, spawn_y, vector_x, vector_y));
        },
        
        spawn_enemies: function() {
            if (Engine.enemies.length < max_enemies) {
                //Engine.log("creating enemy...");
                Engine.create_enemy();
            } else {
                //Engine.log("max reached! enemy not created!");
            }
            
            setTimeout(Engine.spawn_enemies, spawn_delay);
        },

        //getter properties
        get cursor_x() { return cursor.x; },

        get cursor_y() { return cursor.y; },
        
        get num_frames() {return num_frames; },
        
        get infos() {return infos_div; },

        get game_area_x() { return window.innerWidth; },

        get game_area_y() { return window.innerHeight; },
        
        get shooter_cooldown() { return shooter_cooldown; },
        
        get shooters() { return shooters;},
        
        get bullets() {return bullets;},
        
        get enemies() {return enemies;},
        
        get objects() { return objects; },
        
        get score() {return score;},
        
        get rapid_fire() { return rapid_fire; },
        
        get bouncing_bullets() { return bouncing_bullets; },
        
        get piercing_shots() { return piercing_shots; },
        
        get invincibility() { return invincibility; },
        
        get fragile_enemies() { return fragile_enemies; },
    };
})();

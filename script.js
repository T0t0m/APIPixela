$(document).ready(function () {
    const apiUrl = "https://pixe.la/v1/users";
    const token = localStorage.getItem("pixelaToken");
    const username = localStorage.getItem("pixelaUsername");

    // Vérifie si l'utilisateur est déjà connecté
    if (token && username) {
        afficherInterfaceConnecte();
        listerGraphes();
    }

    // Gestion des boutons de navigation
    $("#login-btn").click(() => afficherFormulaire("login"));
    $("#register-btn").click(() => afficherFormulaire("register"));
    $("#logout-btn").click(() => deconnexion());

    // Gestion du mode sombre
    $("#toggle-dark-mode").click(function () {
        $("body").toggleClass("dark-mode");
        const mode = $("body").hasClass("dark-mode") ? "sombre" : "clair";
        $(this).text(`Mode ${mode === "sombre" ? "Clair" : "Sombre"}`);
    });

    // Gestion du clic sur le titre pour revenir à la page d'accueil
    $("#home-link").click(function (e) {
        e.preventDefault();
        if (localStorage.getItem("pixelaToken") && localStorage.getItem("pixelaUsername")) {
            afficherInterfaceConnecte();
            listerGraphes();
        } else {
            location.reload();
        }
    });

    // Formulaire d'inscription/connexion
    $("#auth-form").submit(function (e) {
        e.preventDefault();
        const user = $("#username").val();
        const pass = $("#password").val();
        const agreeTerms = $("#agree-terms").is(":checked") ? "yes" : "no";
        const notMinor = $("#not-minor").is(":checked") ? "yes" : "no";

        if ($("#auth-title").text() === "Connexion") {
            connexion(user, pass);
        } else {
            inscription(user, pass, agreeTerms, notMinor);
        }
    });

    // Créer un graphe
    $("#create-graph-form").submit(function (e) {
        e.preventDefault();
        const graphId = $("#graph-id").val();
        const graphName = $("#graph-name").val();
        const graphColor = $("#graph-color").val();
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");
        creerGraphe(graphId, graphName, graphColor, username, token);
    });

    // Ajouter un pixel
    $("#add-pixel-form").submit(function (e) {
        e.preventDefault();
        const date = $("#pixel-date").val().replace(/-/g, "");
        const quantity = $("#pixel-quantity").val();
        const graphId = $("#graphs-list li.selected").data("id");
        ajouterPixel(graphId, date, quantity);
    });

    // Supprimer un pixel
    $("#delete-pixel-form").submit(function (e) {
        e.preventDefault();
        const date = $("#delete-pixel-date").val().replace(/-/g, "");
        const graphId = $("#graphs-list li.selected").data("id");
        supprimerPixel(graphId, date);
    });

    // Affiche le formulaire d'inscription ou de connexion
    function afficherFormulaire(type) {
        $("#auth-section").show();
        $("#auth-title").text(type === "login" ? "Connexion" : "Inscription");

        if (type === "register") {
            $("#auth-form").append(`
                <div>
                    <input type="checkbox" id="agree-terms" required> J'accepte les conditions d'utilisation<br>
                    <input type="checkbox" id="not-minor" required> Je confirme être majeur<br>
                </div>
            `);
        } else {
            $("#agree-terms, #not-minor").parent().remove();
        }
    }

    // Gère l'inscription
    function inscription(user, pass, agreeTerms, notMinor) {
        $.ajax({
            url: apiUrl,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                token: pass,
                username: user,
                agreeTermsOfService: agreeTerms,
                notMinor: notMinor
            })
        })
        .done(() => {
            alert("Inscription réussie ! Connectez-vous.");
            afficherFormulaire("login");
        })
        .fail((xhr) => {
            const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : "Erreur lors de l'inscription.";
            alert(errorMessage);
        });
    }

    // Gère la connexion (avec vérification via l'API)
    function connexion(user, pass) {
        $.ajax({
            url: `${apiUrl}/${user}/graphs`,
            method: "GET",
            headers: { "X-USER-TOKEN": pass }
        })
        .done(() => {
            localStorage.setItem("pixelaToken", pass);
            localStorage.setItem("pixelaUsername", user);
            afficherInterfaceConnecte();
            listerGraphes();
            $(".connect").hide(); // Masquer la classe .connect
            $(".sidebar").show(); // Afficher la classe .sidebar
            $("main").show(); // Afficher la balise <main>
        })
        .fail(() => {
            alert("Identifiants incorrects. Veuillez vérifier votre nom d'utilisateur et mot de passe.");
        });
    }

    // Déconnexion
    function deconnexion() {
        localStorage.clear();
        location.reload();
    }

    // Affiche l'interface utilisateur connecté
    function afficherInterfaceConnecte() {
        $("#auth-section, #login-btn, #register-btn").hide();
        $("#logout-btn, #graphs-section").show();
    }

    // Crée un graphe
    function creerGraphe(id, name, color, username, token) {
        $.ajax({
            url: `${apiUrl}/${username}/graphs`,
            method: "POST",
            headers: { "X-USER-TOKEN": token },
            contentType: "application/json",
            data: JSON.stringify({
                id: id,
                name: name,
                unit: "commit",
                type: "int",
                color: color
            })
        })
        .done(() => {
            alert("Graphe créé avec succès !");
            listerGraphes(); // Mettre à jour la liste des graphes après la création
        })
        .fail((xhr, status, error) => {
            const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : "Erreur lors de la création du graphe.";
            console.error(errorMessage);  // Affichage de l'erreur détaillée dans la console
            alert(errorMessage);  // Affichage d'un message d'alerte avec l'erreur
        });
    }

    // Liste les graphes
    function listerGraphes() {
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");

        $.ajax({
            url: `${apiUrl}/${username}/graphs`,
            method: "GET",
            headers: { "X-USER-TOKEN": token }
        })
        .done((data) => {
            const graphsList = $("#graphs-list");
            graphsList.empty();
            data.graphs.forEach(graph => {
                const item = $(`
                    <li data-id="${graph.id}" data-name="${graph.name}">
                        ${graph.name} (${graph.id})
                        <button class="delete-graph-btn" data-id="${graph.id}">🗑️</button>
                    </li>
                `);
                item.click(function () {
                    $("#graphs-list li").removeClass("selected");
                    $(this).addClass("selected");
                    $("#pixels-section").show();
                    $("#graph-title").text(`${graph.name} (${graph.id})`); // Mettre à jour le titre
                    afficherGraphe(graph.id); // Afficher le graphe
                });
                graphsList.append(item);
            });

            // Ajouter un gestionnaire d'événements pour les boutons de suppression
            $(".delete-graph-btn").off("click").on("click", function (e) {
                e.stopPropagation(); // Empêcher le clic de sélectionner le graphe
                const graphId = $(this).data("id");
                supprimerGraphe(graphId);
            });
        })
        .fail(() => alert("Erreur lors du chargement des graphes."));
    }

    // Affiche le graphe
    function afficherGraphe(graphId) {
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");

        const graphImageUrl = `${apiUrl}/${username}/graphs/${graphId}`;
        $("#graph-image").attr("src", graphImageUrl);
    }

    // Ajoute un pixel
    function ajouterPixel(graphId, date, quantity) {
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");

        $.ajax({
            url: `${apiUrl}/${username}/graphs/${graphId}`,
            method: "POST",
            headers: { "X-USER-TOKEN": token },
            contentType: "application/json",
            data: JSON.stringify({ date: date, quantity: quantity })
        })
        .done(() => {
            alert("Pixel ajouté avec succès !");
            afficherGraphe(graphId); // Mettre à jour le graphe après l'ajout d'un pixel
        })
        .fail(() => alert("Erreur lors de l'ajout du pixel."));
    }

    // Supprime un pixel
    function supprimerPixel(graphId, date) {
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");

        $.ajax({
            url: `${apiUrl}/${username}/graphs/${graphId}/${date}`,
            method: "DELETE",
            headers: { "X-USER-TOKEN": token }
        })
        .done(() => {
            alert("Pixel supprimé avec succès !");
            // Ajoutez un délai pour garantir que l'image est rechargée après la suppression
            setTimeout(() => {
                afficherGraphe(graphId); // Mettre à jour le graphe après la suppression d'un pixel
            }, 500);
        })      
        .fail(() => alert("Erreur lors de la suppression du pixel."));
    }

    // Supprime un graphe
    function supprimerGraphe(graphId) {
        const username = localStorage.getItem("pixelaUsername");
        const token = localStorage.getItem("pixelaToken");

        $.ajax({
            url: `${apiUrl}/${username}/graphs/${graphId}`,
            method: "DELETE",
            headers: { "X-USER-TOKEN": token }
        })
        .done(() => {
            alert("Graphe supprimé avec succès !");
            listerGraphes(); // Mettre à jour la liste des graphes après la suppression
            $("#pixels-section").hide(); // Masquer la section des pixels
            $("#graph-title").text("Sélectionnez un graphe"); // Réinitialiser le titre
            $("#graph-image").attr("src", ""); // Réinitialiser l'image du graphe
        })
        .fail(() => alert("Erreur lors de la suppression du graphe."));
    }
});

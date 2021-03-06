App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    loading: false,
    tokenPrice: 1000000000000000,
    tokensSold: 0,
    tokensAvailable: 750000,

    init: function() {
        console.log("App initialized...")
        return App.initWeb3();
    },

    initWeb3: function() {
        if (typeof web3 !== 'undefined') {
            // If a web3 instance is already provided by Meta Mask.
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
          } else {
            // Specify default instance if no web3 instance provided
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
          }
          return App.initContracts();
    },

    initContracts: function() {
        $.getJSON("DappTokenSale.json", dappTokenSale => {
            App.contracts.DappTokenSale = TruffleContract(dappTokenSale);
            App.contracts.DappTokenSale.setProvider(App.web3Provider);
            App.contracts.DappTokenSale.deployed().then(dappTokenSale => {
                console.log("Dapp Token Sale Address:", dappTokenSale.address);
            });
        }).done(function() {
            $.getJSON("DappToken.json", dappToken => {
                App.contracts.DappToken = TruffleContract(dappToken);
                App.contracts.DappToken.setProvider(App.web3Provider);
                App.contracts.DappToken.deployed().then(dappToken => {
                    console.log("Dapp Token Address:", dappToken.address);
                });
                App.listenForEvents();
                return App.render();
            });
        })
    },

    listenForEvents: function() {
        App.contracts.DappTokenSale.deployed().then(instance => {
            instance.Sell({}, {
                fromBlock: 0,
                toBlock: 'lastest',
            }).watch(function(error, event) {
                App.render();
            })
        })
    },

    render: function() {
        if(App.loading)
            return;
        App.loading = true;

        var loader = $('#loader');
        var content = $('#content');

        loader.show();
        content.hide();

        web3.eth.getCoinbase(function(err,account) {
            if(err === null) {
                App.account = account;
                $('#accountAddress').html("Your Account: " + account);
            }
        })

        App.contracts.DappTokenSale.deployed().then(function(instance) {
            dappTokenSaleInstance = instance;
            return dappTokenSaleInstance.tokenPrice();
          }).then(function(tokenPrice) {
            App.tokenPrice = App.tokenPrice;
            $('.token-price').html(web3.fromWei(tokenPrice, 'Ether').toNumber());
            return dappTokenSaleInstance.tokensSold();
          }).then(function(tokensSold) {
            App.tokensSold = tokensSold;
            $('.tokens-sold').html(App.tokensSold.toNumber());
            $('.tokens-available').html(App.tokensAvailable);
            
            var progressPrecent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
            $('#progress').css('width', progressPrecent + '%');
            
            App.contracts.DappToken.deployed().then(function(instance) {
                dappTokenInstance = instance;
                return dappTokenInstance.balanceOf(App.account);
            }).then(function(balance) {
                $('.dapp-balance').html(balance.toNumber());
                App.loading = false;
                loader.hide();
                content.show();
            })
        });
      
    },

    buyTokens: function() {
        $('#content').hide();
        $('#loader').show();
        var numberOfTokens = $('#numberOfTokens').val();
        App.contracts.DappTokenSale.deployed().then(instance => {
            return instance.buyTokens(numberOfTokens, {
                from: App.account,
                value:  App.tokenPrice * numberOfTokens,
                gas: 500000
            });
        }).then(result => {
            console.log("Token bought...");
            $('form').trigger('reset');
            $('#loader').hide();
            $('#content').show();
        })
    }

}

$(function() {
    $(window).load(function() {
        App.init();
    })
});
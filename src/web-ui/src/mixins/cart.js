import { mapState } from 'vuex';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';
import { AnalyticsHandler } from '@/analytics/AnalyticsHandler';
import AmplifyStore from '@/store/store';
import swal from 'sweetalert';

const CartsRepository = RepositoryFactory.get('carts');

const parseCart = (cart) =>
  cart.items !== null
    ? cart
    : {
        ...cart,
        items: [],
      };

export const cart = {
  data() {
    return {
      cart: null,
    };
  },
  computed: {
    ...mapState(['cartID']),
  },
  methods: {
    async createCart(username) {
      const { data } = await CartsRepository.createCart(username);

      const cart = parseCart(data);

      this.cart = cart;

      AmplifyStore.commit('setCartID', cart.id);
    },
    async getCart(username) {
      // Since cart service holds carts in memory, they can be lost on restarts.
      // Make sure our cart was returned. Otherwise create a new one.
      if (this.cartID === null) return this.createCart(username);

      const { data } = await CartsRepository.getCartByID(this.cartID);

      if (data.id !== this.cartID) {
        console.warn(`Cart ${this.cartID} not found. Creating new cart. Was cart service restarted?`);
        return this.createCart(username);
      }

      this.cart = parseCart(data);
    },
    async addToCart(user, product, quantity, feature, exp) {
      const existingProduct = this.cart.items.find((item) => item.product_id === product.id);

      if (existingProduct) {
        existingProduct.quantity += quantity;
      } else {
        this.cart.items.push({ product_id: product.id, price: product.price, quantity });
      }

      const { data } = await CartsRepository.updateCart(this.cart);

      this.cart = parseCart(data);

      this.recordAddedToCart(user, product, existingProduct?.quantity ?? quantity, feature, exp);

      this.renderAddedToCartConfirmation();
    },
    recordAddedToCart(user, product, quantity, feature, exp) {
      AnalyticsHandler.productAddedToCart(user, this.cart, product, quantity, feature, exp);
    },
    renderAddedToCartConfirmation() {
      swal({
        title: 'Added to Cart',
        icon: 'success',
        buttons: {
          cancel: 'Continue Shopping',
          cart: 'View Cart',
        },
      }).then((value) => {
        switch (value) {
          case 'cancel':
            break;
          case 'cart':
            this.$router.push('/cart');
        }
      });
    },
  },
};

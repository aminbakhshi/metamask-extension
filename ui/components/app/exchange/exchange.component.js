import React, {useContext, useCallback} from 'react';
import { isEqual } from 'lodash';
import {useDispatch, useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';

import DropdownInputPair from '../../../pages/swaps/dropdown-input-pair';

import {
    getSwapsDefaultToken,
    getCurrentChainId,
    getTokenExchangeRates,
    getCurrentCurrency,
    getTokenList,
    getUseTokenDetection,
  } from '../../../selectors';
import { I18nContext } from '../../../contexts/i18n';
import { getConversionRate } from '../../../ducks/metamask/metamask';
import { calcTokenAmount } from '../../../helpers/utils/token-util';
import { useEthFiatAmount } from '../../../hooks/useEthFiatAmount';
import { useTokenFiatAmount } from '../../../hooks/useTokenFiatAmount';
import {
    countDecimals,
  } from '../../../pages/swaps/swaps.util';
import {
  isSwapsDefaultTokenSymbol,
} from '../../../../shared/modules/swaps.utils';
import {
    getRenderableTokenData,
  } from '../../../hooks/useTokensToSearch';
  import {
    getFromToken,
    setFromTokenInputValue,
    setBalanceError,
    setFromTokenError,
    getFetchParams,
    getBalanceError,
    getFromTokenInputValue,
  } from '../../../ducks/swaps/swaps';
  

const ExchangeContainer = ()=> {

    const t = useContext(I18nContext);
    const dispatch = useDispatch();

    const fromToken = useSelector(getFromToken, isEqual);
    const defaultSwapsToken = useSelector(getSwapsDefaultToken, isEqual);
    const chainId = useSelector(getCurrentChainId);
    const tokenConversionRates = useSelector(getTokenExchangeRates, isEqual);
    const conversionRate = useSelector(getConversionRate);
    const currentCurrency = useSelector(getCurrentCurrency);
    const tokenList = useSelector(getTokenList, isEqual);
    const useTokenDetection = useSelector(getUseTokenDetection);
    const balanceError = useSelector(getBalanceError);
    const fromTokenInputValue = useSelector(getFromTokenInputValue);

    const swapFromTokenFiatValue = useTokenFiatAmount(
        fromTokenAddress,
        fromTokenInputValue || 0,
        fromTokenSymbol,
        {
          showFiat: true,
        },
        true,
      );

    const swapFromEthFiatValue = useEthFiatAmount(
        fromTokenInputValue || 0,
        { showFiat: true },
        true,
      );
    
    const swapFromFiatValue = isSwapsDefaultTokenSymbol(fromTokenSymbol, chainId)
    ? swapFromEthFiatValue
    : swapFromTokenFiatValue;

    const fetchParams = useSelector(getFetchParams, isEqual);
    const { sourceTokenInfo = {}, destinationTokenInfo = {} } =
    fetchParams?.metaData || {};

    const fetchParamsFromToken = isSwapsDefaultTokenSymbol(
        sourceTokenInfo?.symbol,
        chainId,
      )
        ? defaultSwapsToken
        : sourceTokenInfo;

    const selectedFromToken = getRenderableTokenData(
        fromToken || fetchParamsFromToken,
        tokenConversionRates,
        conversionRate,
        currentCurrency,
        chainId,
        tokenList,
        useTokenDetection,
      );

      const {
        address: fromTokenAddress,
        symbol: fromTokenSymbol,
        string: fromTokenString,
        decimals: fromTokenDecimals,
        balance: rawFromTokenBalance,
      } = selectedFromToken || {};

      const fromTokenBalance =
    rawFromTokenBalance &&
    calcTokenAmount(rawFromTokenBalance, fromTokenDecimals).toString(10);

    const onFromSelect = (token) => {
        if (
          token?.address &&
          !swapFromFiatValue &&
          fetchedTokenExchangeRate !== null
        ) {
          fetchTokenPrice(token.address).then((rate) => {
            if (rate !== null && rate !== undefined) {
              setFetchedTokenExchangeRate(rate);
            }
          });
        } else {
          setFetchedTokenExchangeRate(null);
        }
        if (
          token?.address &&
          !memoizedUsersTokens.find((usersToken) =>
            isEqualCaseInsensitive(usersToken.address, token.address),
          )
        ) {
          fetchTokenBalance(token.address, selectedAccountAddress).then(
            (fetchedBalance) => {
              if (fetchedBalance?.balance) {
                const balanceAsDecString = fetchedBalance.balance.toString(10);
                const userTokenBalance = calcTokenAmount(
                  balanceAsDecString,
                  token.decimals,
                );
                dispatch(
                  setSwapsFromToken({
                    ...token,
                    string: userTokenBalance.toString(10),
                    balance: balanceAsDecString,
                  }),
                );
              }
            },
          );
        }
        dispatch(setSwapsFromToken(token));
        onInputChange(
          token?.address ? fromTokenInputValue : '',
          token.string,
          token.decimals,
        );
      };

    const onInputChange = useCallback(
        (newInputValue, balance) => {
          dispatch(setFromTokenInputValue(newInputValue));
          const newBalanceError = new BigNumber(newInputValue || 0).gt(
            balance || 0,
          );
          // "setBalanceError" is just a warning, a user can still click on the "Review Swap" button.
          if (balanceError !== newBalanceError) {
            dispatch(setBalanceError(newBalanceError));
          }
          dispatch(
            setFromTokenError(
              fromToken && countDecimals(newInputValue) > fromToken.decimals
                ? 'tooManyDecimals'
                : null,
            ),
          );
        },
        [dispatch, fromToken, balanceError],
      );

    return (
        <div className="exchange__container">
            <div className="exchange__dropdown-input-pair-header">
                <div className="exchange__input-label">{t('swapSwapFrom')}</div>
                {!isSwapsDefaultTokenSymbol(fromTokenSymbol, chainId) && (
                    <div
                    className="exchange__max-button"
                    data-testid="exchange__max-button"
                    onClick={() =>
                        onInputChange(fromTokenBalance || '0', fromTokenBalance)
                    }
                    >
                    {t('max')}
                    </div>
                )}
            </div>
            <DropdownInputPair
                onSelect={onFromSelect}
                itemsToSearch={tokensToSearchSwapFrom}
                onInputChange={(value) => {
                    onInputChange(value, fromTokenBalance);
                }}
                inputValue={fromTokenInputValue}
                leftValue={fromTokenInputValue && swapFromFiatValue}
                selectedItem={selectedFromToken}
                maxListItems={30}
                loading={
                    loading &&
                    (!tokensToSearchSwapFrom?.length ||
                    !topAssets ||
                    !Object.keys(topAssets).length)
                }
                selectPlaceHolderText={t('swapSelect')}
                hideItemIf={(item) =>
                    isEqualCaseInsensitive(item.address, selectedToToken?.address)
                }
                listContainerClassName="build-quote__open-dropdown"
                autoFocus
            />
        </div>
    )
}

export default ExchangeContainer;